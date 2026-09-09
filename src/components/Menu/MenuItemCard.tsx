"use client"

import React, { useState } from "react"
import Image from "next/image"
import { Check, Pencil, Trash2, X } from "lucide-react"
import toast from "react-hot-toast"
import { deleteApi, patchApi } from "@/utils/common"
import { ApiResponse } from "@/utils/api"
import { IMenu } from "@/types/menu"
import { REMOVE_ITEM, UPDATE_ITEM } from "@/utils/APIConstant"

export type MenuItemPatch = {
  title: string
  price: number
  originalPrice?: number
  quantity: number
}

interface MenuItemCardProps {
  id: string
  deleteCard: (id: string) => void
  updateCard: (id: string, data: MenuItemPatch) => void
  image: string
  title: string
  quantity: number
  price: number
  originalPrice?: number
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  id,
  deleteCard,
  updateCard,
  image,
  title,
  price,
  quantity,
  originalPrice,
}) => {
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Draft values live as strings so a half-typed field doesn't snap to 0.
  const [draft, setDraft] = useState({
    title,
    price: String(price),
    originalPrice: originalPrice != null ? String(originalPrice) : "",
    quantity: String(quantity),
  })

  const discount =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null

  const startEditing = () => {
    setDraft({
      title,
      price: String(price),
      originalPrice: originalPrice != null ? String(originalPrice) : "",
      quantity: String(quantity),
    })
    setEditing(true)
  }

  const handleSave = async () => {
    if (saving) return

    const name = draft.title.trim()
    const nextPrice = Number(draft.price)
    const nextQuantity = Number(draft.quantity)
    const nextOriginal = draft.originalPrice.trim()

    if (!name) {
      toast.error("Name cannot be empty")
      return
    }

    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      toast.error("Enter a valid price")
      return
    }

    try {
      setSaving(true)
      toast.loading("Saving...", { id: "update-item" })

      const res = await patchApi<ApiResponse<IMenu>>({
        url: UPDATE_ITEM,
        values: {
          id,
          title: name,
          price: nextPrice,
          quantity: Number.isFinite(nextQuantity) ? nextQuantity : 0,
          // null clears the strike-through price; undefined would be dropped by JSON.
          originalPrice: nextOriginal === "" ? null : Number(nextOriginal),
        },
      })

      if (!res?.success) {
        throw new Error(res?.message)
      }

      updateCard(id, {
        title: res.data.title,
        price: res.data.price,
        originalPrice: res.data.originalPrice,
        quantity: res.data.quantity,
      })

      setEditing(false)
      toast.success("Item updated", { id: "update-item" })
    } catch (err: any) {
      toast.error(err.message || "Failed to update item", { id: "update-item" })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (deleting) return

    try {
      setDeleting(true)
      toast.loading("Deleting item...", { id: "delete-item" })

      const res = await deleteApi<ApiResponse<IMenu>>({
        url: REMOVE_ITEM,
        param: { id },
      })

      if (!res?.success) {
        throw new Error(res?.message)
      }

      deleteCard(id)
      toast.success("Item deleted", { id: "delete-item" })
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || err.message || "Failed to delete item",
        { id: "delete-item" }
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="group relative m-5 w-56 md:w-72 overflow-hidden rounded-2xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-md hover:shadow-xl transition-all duration-300">
      <div className="relative mx-3 mt-3 h-40 md:h-64 overflow-hidden rounded-xl">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {discount && !editing && (
          <span className="absolute top-3 left-3 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 px-3 py-1 text-xs font-semibold text-white">
            {discount}% OFF
          </span>
        )}

        {/* Always visible - a hover-only control cannot be reached on a phone. */}
        {!editing && (
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={startEditing}
              aria-label={`Edit ${title}`}
              className="rounded-full bg-white/90 p-2 text-gray-700 shadow-sm transition hover:text-indigo-600 active:scale-95"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              aria-label={`Delete ${title}`}
              className="rounded-full bg-white/90 p-2 text-gray-700 shadow-sm transition hover:text-red-600 active:scale-95 disabled:opacity-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="px-4 pb-4 pt-3">
        {editing ? (
          <div className="space-y-2">
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Item name"
              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
            />

            <div className="flex gap-2">
              <label className="flex-1">
                <span className="text-[10px] uppercase tracking-wide text-gray-500">Price</span>
                <input
                  value={draft.price}
                  onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                  inputMode="numeric"
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                />
              </label>

              <label className="flex-1">
                <span className="text-[10px] uppercase tracking-wide text-gray-500">Was</span>
                <input
                  value={draft.originalPrice}
                  onChange={(e) => setDraft((d) => ({ ...d, originalPrice: e.target.value }))}
                  inputMode="numeric"
                  placeholder="—"
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                />
              </label>

              <label className="flex-1">
                <span className="text-[10px] uppercase tracking-wide text-gray-500">Grams</span>
                <input
                  value={draft.quantity}
                  onChange={(e) => setDraft((d) => ({ ...d, quantity: e.target.value }))}
                  inputMode="numeric"
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                />
              </label>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 text-sm font-medium text-white transition hover:bg-indigo-700 active:scale-[.98] disabled:opacity-60"
              >
                <Check size={16} />
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                className="flex min-h-9 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 active:scale-[.98]"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <h5 className="text-base font-semibold truncate">{title}</h5>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-xs text-gray-500">1 pc • {quantity} g</p>
              <span className="text-xl font-bold">₹{price}</span>
              {originalPrice && (
                <span className="text-sm line-through text-gray-500">
                  ₹{originalPrice}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MenuItemCard
