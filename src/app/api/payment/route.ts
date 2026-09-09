import Razorpay from "razorpay"
import mongoose from "mongoose"
import { NextRequest, NextResponse } from "next/server"
import { verifyAuth } from "@/middleware/auth"
import { sendRJResponse } from "@/utils/api"
import { Cart } from "@/model/cart"
import { Order } from "@/model/order"
import { Transaction, TransactionStatus } from "@/model/transations"
import { Merchants } from "@/model/merchants"
import { TableSession, TableSessionStatus } from "@/model/tableSession"
import { resolveTableSession } from "@/utils/tableSession"

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function GET(req: NextRequest) {
  let lockedSessionId: mongoose.Types.ObjectId | null = null
  let paymentStarted = false

  try {
    const userId = await verifyAuth(req)
    const merchantId = req.nextUrl.searchParams.get("mid");

    if (!userId || userId instanceof NextResponse) {
      return sendRJResponse({
        success: false,
        message: "Unauthorized",
        status: 401,
      })
    }

    if (!merchantId) {
      return sendRJResponse({
        success: false,
        message: "Need Merchant Id",
        status: 400,
      })
    }

    const merchant = await Merchants.findById(merchantId)

    if (!merchant) {
      return sendRJResponse({
        success: false,
        message: "Merchant not found",
        status: 404,
      })
    }

    const me = new mongoose.Types.ObjectId(String(userId))
    const session = await resolveTableSession(req, me)

    // A table session knows its own table; a plain link falls back to the url.
    const tableName =
      session?.tableName ||
      req.nextUrl.searchParams.get("table")?.trim().slice(0, 100) ||
      ""

    if (session) {
      // Exactly one person pays for a table. This findOneAndUpdate only matches
      // while the session is still OPEN, so the second tap loses the race and
      // is told who is paying instead of opening a second Razorpay order.
      const locked = await TableSession.findOneAndUpdate(
        { _id: session._id, status: TableSessionStatus.OPEN },
        { $set: { status: TableSessionStatus.LOCKED, lockedBy: me }, $inc: { version: 1 } },
        { new: true }
      )

      if (!locked) {
        // Re-read: the lock was taken between our read and our update, so the
        // holder is only on the fresh copy.
        const current = await TableSession.findById(session._id)
        const holder = current?.members.find(
          (m: any) => String(m.userId) === String(current.lockedBy)
        )

        return sendRJResponse({
          success: false,
          message: `${holder?.name || "Someone"} at your table is already placing the order`,
          status: 409,
        })
      }

      lockedSessionId = session._id
    }

    const cart = await Cart.findOne(
      session ? { sessionId: session._id } : { userId: me }
    ).populate({
      path: "items.item",
      select: "price title",
    })

    if (!cart || !cart.items.length) {
      return sendRJResponse({
        success: false,
        message: "Cart is empty",
        status: 400,
      })
    }

    // The amount is always recomputed from the DB price, never trusted from the
    // client, so a tampered cart in the browser cannot change what is charged.
    // At a shared table this sums every member's lines.
    const amount = cart.items.reduce((total: number, cartItem: any) => {
      return total + cartItem.item.price * cartItem.quantity
    }, 0)

    if (amount <= 0) {
      return sendRJResponse({
        success: false,
        message: "Invalid amount",
        status: 400,
      })
    }

    const order = await Order.create({
      userId,
      merchantId,
      items: cart.items.map((cartItem: any) => ({
        item: cartItem.item._id,
        quantity: cartItem.quantity,
      })),
      amount,
      tableName,
      sessionId: session?._id,
    })

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay works in paise
      currency: "INR",
      receipt: `ord_${order._id}`,
      notes: {
        orderId: String(order._id),
        purpose: "checkout",
        merchant: merchant.name,
        email: merchant.email,
        table: tableName,
      },
    })

    await Transaction.create({
      userId,
      merchantId,
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount,
      status: TransactionStatus.PENDING,
    })

    paymentStarted = true

    return sendRJResponse({
      success: true,
      message: "Payment initiated successfully",
      data: razorpayOrder,
      status: 200,
    })
  } catch (error) {
    console.error("Error while payments:", error)
    return sendRJResponse({
      success: false,
      message: "Internal server error",
      status: 500,
    })
  } finally {
    // Empty cart, Razorpay down, a thrown error - anything that bails out after
    // the lock must hand the table back, or nobody can ever pay for it.
    if (lockedSessionId && !paymentStarted) {
      await TableSession.updateOne(
        { _id: lockedSessionId, status: TableSessionStatus.LOCKED },
        { $set: { status: TableSessionStatus.OPEN }, $unset: { lockedBy: 1 }, $inc: { version: 1 } }
      ).catch((error) => console.error("Failed to release table lock:", error))
    }
  }
}
