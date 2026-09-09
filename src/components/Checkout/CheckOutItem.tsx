"use client"

import { useAppDispatch } from "@/hook/redux"
import {
  CheckOutItems,
  decrementCheckOutItem,
  incrementCheckOutItem,
  removeCheckItem,
  syncCartWithDB,
} from "@/store/reducer/checkout"
import Image from "next/image"
import React from "react"

function CheckOutItem({ item }: { item: CheckOutItems }) {
  const dispatch = useAppDispatch()

  // The controls only ever move this customer's own line, so two people can
  // edit the same dish at the same table without fighting over one number.
  const qty = item.itemCount
  const tableQty = item.tableCount ?? item.itemCount
  const others = (item.contributors ?? []).filter((c) => !c.isMe && c.quantity > 0)

  const handleUpdate = (newQty: number) => {
    if (newQty < 1) {
      dispatch(removeCheckItem(String(item._id)))
      dispatch(syncCartWithDB({ itemId: String(item._id), quantity: 0 }))
      return
    }

    if (newQty > qty) {
      dispatch(incrementCheckOutItem(String(item._id)))
    } else {
      dispatch(decrementCheckOutItem(String(item._id)))
    }

    dispatch(
      syncCartWithDB({
        itemId: String(item._id),
        quantity: newQty,
      })
    )
  }

  return (
    <div className="flex w-full gap-4 rounded-2xl bg-white p-3 shadow-sm hover:shadow-md transition">
      {/* Image */}
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
        <Image
          alt={item.title}
          fill
          sizes="96px"
          src={item.image}
          className="object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
            {item.title}
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            1 pc • {item.quantity} g
          </p>

          {others.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              {others.map((c) => `${c.name} ×${c.quantity}`).join(", ")}
              {qty > 0 && ` · you ×${qty}`}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">
            ₹{item.price * tableQty}
          </span>

          {/* The number is what the whole table is ordering; the buttons still
              move only my own line, since someone else's is theirs to change. */}
          <div className="flex items-center gap-3 rounded-lg border border-green-600 px-2 py-1 text-green-600">
            <button
              onClick={() => handleUpdate(qty - 1)}
              disabled={qty === 0}
              title={qty === 0 ? "You haven't added this one" : "Remove one of yours"}
              className="text-sm font-bold disabled:cursor-not-allowed disabled:opacity-30"
            >
              −
            </button>

            <span className="text-xs font-semibold">{tableQty}</span>

            <button
              onClick={() => handleUpdate(qty + 1)}
              className="text-sm font-bold"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckOutItem
