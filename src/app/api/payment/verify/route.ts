import { verifyAuth } from "@/middleware/auth"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { sendRJResponse } from "@/utils/api"
import { Order } from "@/model/order"
import { Transaction, TransactionStatus } from "@/model/transations"
import { Cart } from "@/model/cart"
import { TableSession, TableSessionStatus } from "@/model/tableSession"
import { clearTableSessionCookie } from "@/utils/tableSession"

export async function POST(req: NextRequest) {
  try {
    const userId = await verifyAuth(req)
    if (!userId || userId instanceof NextResponse) {
      return sendRJResponse({ success: false, message: "Unauthorized", status: 401 })
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return sendRJResponse({
        success: false,
        message: "Invalid payment payload",
        status: 400,
      })
    }

    const transaction = await Transaction.findOne({
      razorpayOrderId: razorpay_order_id,
      userId,
    })

    if (!transaction) {
      return sendRJResponse({
        success: false,
        message: "Transaction not found",
        status: 404,
      })
    }

    if (transaction.status === TransactionStatus.COMPLETED) {
      return sendRJResponse({
        success: true,
        message: "Payment already verified",
        status: 200,
      })
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex")

    const signatureBuffer = Buffer.from(razorpay_signature, "utf8")
    const generatedBuffer = Buffer.from(generatedSignature, "utf8")

    const isValidSignature =
      signatureBuffer.length === generatedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, generatedBuffer)

    if (!isValidSignature) {
      transaction.status = TransactionStatus.FAILED
      transaction.failureReason = "Signature mismatch"
      transaction.gatewayResponse = { razorpay_order_id, razorpay_payment_id }
      await transaction.save()

      return sendRJResponse({
        success: false,
        message: "Payment verification failed",
        status: 400,
      })
    }

    transaction.status = TransactionStatus.COMPLETED
    transaction.razorpayPaymentId = razorpay_payment_id
    transaction.gatewayResponse = {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }
    await transaction.save()

    const order = await Order.findByIdAndUpdate(
      transaction.orderId,
      { paymentStatus: "PAID" },
      { new: true }
    )

    // A paid table is finished: close the session (freeing the table for the
    // next guests) and clear the shared cart. A solo customer just loses theirs.
    if (order?.sessionId) {
      await TableSession.updateOne(
        { _id: order.sessionId },
        {
          $set: { status: TableSessionStatus.CLOSED, closedAt: new Date() },
          $unset: { activeKey: 1, lockedBy: 1 },
          $inc: { version: 1 },
        }
      )
      await Cart.deleteOne({ sessionId: order.sessionId })
    } else {
      await Cart.deleteOne({ userId })
    }

    const res = sendRJResponse({
      success: true,
      message: "Payment verified successfully",
      status: 200,
    })

    return clearTableSessionCookie(res)
  } catch (error) {
    console.error("Verify payment error:", error)
    return sendRJResponse({
      success: false,
      message: "Internal server error",
      status: 500,
    })
  }
}
