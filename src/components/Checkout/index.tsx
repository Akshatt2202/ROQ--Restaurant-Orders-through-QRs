"use client"

import { useAppDispatch, useAppSelector } from "@/hook/redux"
import { CheckOutItems, clearCheckout, syncCartToCheckOut } from "@/store/reducer/checkout"
import React from "react"
import CheckOutItem from "./CheckOutItem"
import { GET_PAYMENT_ORDER, POST_PAYMENT_VERIFY } from "@/utils/APIConstant"
import { ApiResponse } from "@/utils/api"
import { getApi, postApi } from "@/utils/common"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"
import autoTable from "jspdf-autotable"
import jsPDF from "jspdf"
import { getRememberedTable, rememberTable } from "@/utils/table"
import { useTableSession } from "@/hook/useTableSession"
import { RELEASE_TABLE } from "@/utils/APIConstant"
import { Users } from "lucide-react"

export type RazorpayOrder = {
  id: string
  amount: number
  currency: string
  notes?: {
    merchant?: string
    email?: string
    transactionId?: string
    purpose?: string
  }
}

export type RazorpayHandlerResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

function CheckoutPage({ merchantId }: { merchantId: string }) { 
  const checkout: CheckOutItems[] = useAppSelector(state => state.checkOut)
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [isPaying, setIsPaying] = React.useState(false)

  // Rejoin the table on this page too, so the totals stay live while someone
  // else is still adding items from their own phone.
  const session = useTableSession(merchantId, getRememberedTable(merchantId) || undefined)

  const heldByOther =
    session?.status === "LOCKED" && !session.lockedByMe

  const releaseTable = async () => {
    if (!session) return
    await postApi<ApiResponse<void>>({ url: RELEASE_TABLE, values: {} })
  }

  const handlePay = async () => {
    if (isPaying) return
    setIsPaying(true)

    try {
      // The table comes from the scanned QR, kept for this browsing session.
      const table = getRememberedTable(merchantId)

      const res = await getApi<ApiResponse<RazorpayOrder>>({
        url:
          GET_PAYMENT_ORDER +
          `?mid=${merchantId}` +
          (table ? `&table=${encodeURIComponent(table)}` : ""),
      })

      if (!res?.success || !res.data) {
        toast.error(res?.message || "Could not start the payment")
        setIsPaying(false)
        return
      }

      if (!(window as any).Razorpay) {
        toast.error("Razorpay SDK not loaded")
        setIsPaying(false)
        return
      }

      const order = res.data

      const options = { 
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: order.amount,
        currency: order.currency || "INR",
        name: order.notes?.merchant || "QR Menu",
        description: "Your order enters the domain",
        order_id: order.id,
        handler: async function (response: RazorpayHandlerResponse) {
          const verified = await handleLogPayment(response)

          if (!verified) return

          try {
            generateReceiptPDF({
              ...response,
              amount: order.amount,
              order,
            })
          } catch (error) {
            // A failed receipt must never trap the customer on this screen.
            console.error("Error while generating receipt:", error)
          }

          // Payment is done: drop the local cart and send them back to the menu
          // instead of leaving the button spinning on "Processing…".
          dispatch(clearCheckout())
          setIsPaying(false)
          router.replace(
            `/consumer/${merchantId}` +
            (table ? `?table=${encodeURIComponent(table)}` : "")
          )
        },
        modal: {
          ondismiss: () => {
            setIsPaying(false)
            // Hand the table back - otherwise nobody else could ever pay.
            void releaseTable()
            toast("Payment cancelled")
          },
        },
        theme: {
          color: "#16a34a",
        },
      }

      const rzp = new (window as any).Razorpay(options)

      rzp.on("payment.failed", (response: any) => {
        setIsPaying(false)
        void releaseTable()
        toast.error(response?.error?.description || "Payment failed")
      })

      rzp.open()
    } catch (error) {
      console.error("Error while starting payment:", error)
      toast.error("Something went wrong")
      setIsPaying(false)
    }
  }

  const generateReceiptPDF = (payment: any) => {

    const doc = new jsPDF()

    const pageWidth = doc.internal.pageSize.width

    // Header
    doc.setFont("times", "bold")
    doc.setFontSize(22)
    doc.text("Payment Receipt - Qr Menu", pageWidth / 2, 20, { align: "center" })

    doc.setFontSize(12)
    doc.text(`Date: ${new Date().toLocaleString()}`, 14, 35)

    autoTable(doc, {
      startY: 45,
      head: [["Field", "Details"]],
      body: [
        ["Payment ID", payment.razorpay_payment_id],
        ["Order ID", payment.razorpay_order_id],
        ["Merchant", payment.order?.notes?.merchant || "Akshat"],
        ["Table", payment.order?.notes?.table || "—"],
        ["email", payment.order?.notes?.email || "unknown"],
        ["Amount", (payment.amount / 100 || "—")],
        ["Status", "SUCCESS"],
      ],
      theme: "grid"
    })

    doc.save(`receipt-${payment.razorpay_payment_id}.pdf`)
  }

  const handleLogPayment = async (req: RazorpayHandlerResponse): Promise<boolean> => {
    const result = await postApi<ApiResponse<void>>({
      url: POST_PAYMENT_VERIFY,
      values: req as unknown as Record<string, string>
    })

    if (!result?.success) {
      setIsPaying(false)
      toast.error(result?.message || "Payment verification failed")
      return false
    }

    toast.success("Payment successful")
    return true
  }


  React.useEffect(() => {
    // A customer can land here straight from a QR link, so keep the table if
    // it is on the url before falling back to what the menu page stored.
    const table = new URLSearchParams(window.location.search).get("table")
    rememberTable(merchantId, table)

    dispatch(syncCartToCheckOut({ dispatch: dispatch }));
  }, [])

  if (checkout.length === 0) {
    return (
      <div className="px-6 pt-20 text-center text-gray-500">
        Your cart is empty
      </div>
    )
  }

  // At a shared table the bill is everything the table added, not just mine.
  const countOf = (item: CheckOutItems) => item.tableCount ?? item.itemCount

  const originalTotal = checkout.reduce(
    (sum, item) =>
      sum +
      (item.originalPrice ?? item.price) * countOf(item),
    0
  )

  const discountedTotal = checkout.reduce(
    (sum, item) => sum + item.price * countOf(item),
    0
  )

  const savings = originalTotal - discountedTotal

  return (
    <div className="relative min-h-screen bg-gray-50 px-6 pt-20">

      <h1 className="mb-4 font-mono text-2xl text-zinc-950">
        Checkout
      </h1>

      {session && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <Users size={16} />
          <span className="font-medium">Table {session.tableName}</span>
          <span className="text-green-700/70">
            · shared with {session.members.map((m) => (m.isMe ? "you" : m.name)).join(", ")}
          </span>
        </div>
      )}

      {/* Items */}
      <div className="mb-32 flex flex-col gap-3">
        {checkout.map((item) => (
          <CheckOutItem key={String(item._id)} item={item} />
        ))}
      </div>

      {/* Bottom Summary */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white px-6 py-4 shadow-lg">

        <div className="mb-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Item total</span>
            <span className="line-through">₹{originalTotal}</span>
          </div>

          <div className="flex justify-between font-medium text-green-600">
            <span>{session ? "Table total" : "Just for you"}</span>
            <span>₹{discountedTotal}</span>
          </div>

          {savings > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>You saved</span>
              <span>₹{savings}</span>
            </div>
          )}
        </div>

        <button
          onClick={handlePay}
          disabled={isPaying || heldByOther}
          className="w-full cursor-pointer rounded-xl bg-green-600 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
        >
          {heldByOther
            ? `${session?.lockedByName || "Someone"} is placing the order…`
            : isPaying
              ? "Processing…"
              : `Place Order • ₹${discountedTotal}`}
        </button>
      </div>
    </div>
  )
}

export default CheckoutPage
