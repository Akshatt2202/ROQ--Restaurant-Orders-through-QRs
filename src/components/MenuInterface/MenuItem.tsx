"use client"

import { useAppDispatch, useAppSelector } from "@/hook/redux"
import { addCheckOutItem, decrementCheckOutItem, incrementCheckOutItem, syncCartWithDB } from "@/store/reducer/checkout"
import { IMenu } from "@/types/menu"
import Image from "next/image"
import React from "react"

function MenuItem({ item }: { item: IMenu }) {
  const dispatch = useAppDispatch()

  const checkout = useAppSelector(state => state.checkOut)
  const checkoutItem = checkout.find(_i => _i._id === item._id)

  // My own line drives the +/- maths; the table's total is what gets shown, so
  // the grid agrees with the cart when others at the table added the same dish.
  const qty = checkoutItem?.itemCount ?? 0
  const tableQty = checkoutItem?.tableCount ?? qty

  const discount =
    item.originalPrice && item.originalPrice > item.price
      ? Math.round(
          ((item.originalPrice - item.price) / item.originalPrice) * 100
        )
      : null

  const handleUpdate = (newQty: number) => {

    if (newQty > qty) {
      dispatch(addCheckOutItem(item))
    } else {
      dispatch(decrementCheckOutItem(String(item._id)))
    }

    dispatch(syncCartWithDB({ itemId: String(item._id), quantity: newQty }))

  }

  return (
    <div className="w-39 sm:w-44 md:w-48 rounded-2xl bg-white p-3 shadow-sm hover:shadow-md transition">

      <div className="relative h-28 w-full rounded-xl overflow-hidden">
        <Image
          alt="Menu item"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          crossOrigin="anonymous"
          src={item.image}
          className="object-cover"
        />

        {discount && (
          <span className="absolute top-1 left-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 px-3 py-1 text-xs font-semibold text-white">
            {discount}% OFF
          </span>
        )}
      </div>

      <div className="mt-2 space-y-1">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
          {item.title}
        </h3>

        <p className="text-xs text-gray-500">
          1 pc • {item.quantity} g
        </p>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex flex-col">
            {item.originalPrice && (
              <span className="text-xs line-through text-gray-500">
                ₹{item.originalPrice}
              </span>
            )}
            <span className="text-sm font-semibold text-gray-900">
              ₹{item.price}
            </span>
          </div>

          {tableQty === 0 ? (
            <button
              onClick={() => handleUpdate(1)}
              className="min-h-9 rounded-lg border border-green-600 px-4 text-xs font-semibold text-green-600 transition hover:bg-green-50 active:scale-95 active:bg-green-100"
            >
              ADD
            </button>
          ) : (
            <div className="flex flex-col items-end gap-0.5">
              {/* Explicit 32px hit areas - a bare glyph is far too small to tap. */}
              <div className="flex items-center rounded-lg border border-green-600 text-green-600">
                <button
                  onClick={() => handleUpdate(qty-1)}
                  disabled={qty === 0}
                  aria-label="Remove one"
                  className="flex h-8 w-8 items-center justify-center text-base font-bold transition active:bg-green-100 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  −
                </button>
                <span className="min-w-6 text-center text-xs font-semibold tabular-nums">{tableQty}</span>
                <button
                  onClick={() => handleUpdate(qty+1)}
                  aria-label="Add one"
                  className="flex h-8 w-8 items-center justify-center text-base font-bold transition active:bg-green-100"
                >
                  +
                </button>
              </div>

              {tableQty !== qty && (
                <span className="text-[10px] text-gray-500">you ×{qty}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MenuItem
