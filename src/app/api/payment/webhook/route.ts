import crypto from "crypto"
import { NextRequest } from "next/server"
import mongoServer from "@/config/mongoConfig"
import { Transaction, TransactionStatus } from "@/model/transations"
import { Order, PaymentStatus } from "@/model/order"
import { Cart } from "@/model/cart"
import { TableSession, TableSessionStatus } from "@/model/tableSession"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    // Razorpay signs the RAW body, so it must be read as text before parsing.
    const body = await req.text()
    const signature = req.headers.get("x-razorpay-signature")

    if (!signature || !process.env.RAZORPAY_WEBHOOK_SECRET) {
      return new Response("Invalid signature", { status: 400 })
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest("hex")

    const signatureBuffer = Buffer.from(signature, "utf8")
    const expectedBuffer = Buffer.from(expectedSignature, "utf8")

    const isValidSignature =
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer)

    if (!isValidSignature) {
      return new Response("Invalid signature", { status: 400 })
    }

    await mongoServer()

    const payload = JSON.parse(body)
    const event = payload.event
    const entity = payload?.payload?.payment?.entity
    const razorpayOrderId = entity?.order_id

    if (!razorpayOrderId) {
      return new Response("OK", { status: 200 })
    }

    if (event === "payment.failed") {
      // Never downgrade a payment that is already captured/verified.
      const failed = await Transaction.findOneAndUpdate(
        { razorpayOrderId, status: { $ne: TransactionStatus.COMPLETED } },
        {
          status: TransactionStatus.FAILED,
          failureReason: entity?.error_description,
          gatewayResponse: payload,
        },
        { new: true }
      )

      // Give the table back so somebody else can try to pay.
      if (failed) {
        const order = await Order.findById(failed.orderId, { sessionId: 1 })

        if (order?.sessionId) {
          await TableSession.updateOne(
            { _id: order.sessionId, status: TableSessionStatus.LOCKED },
            { $set: { status: TableSessionStatus.OPEN }, $unset: { lockedBy: 1 }, $inc: { version: 1 } }
          )
        }
      }
    }

    if (event === "payment.captured") {
      const transaction = await Transaction.findOneAndUpdate(
        { razorpayOrderId },
        {
          status: TransactionStatus.COMPLETED,
          razorpayPaymentId: entity?.id,
          gatewayResponse: payload,
        },
        { new: true }
      )

      // Safety net: if the browser never reached /payment/verify (tab closed,
      // network drop), the webhook still settles the order and clears the cart.
      if (transaction) {
        const order = await Order.findByIdAndUpdate(
          transaction.orderId,
          { paymentStatus: PaymentStatus.PAID },
          { new: true }
        )

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
          await Cart.deleteOne({ userId: transaction.userId })
        }
      }
    }

    return new Response("OK", { status: 200 })
  } catch (error) {
    console.error("Razorpay webhook error:", error)
    return new Response("Webhook handling failed", { status: 500 })
  }
}
