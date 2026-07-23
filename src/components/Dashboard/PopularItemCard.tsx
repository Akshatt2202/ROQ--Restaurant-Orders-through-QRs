"use client"

import { ApiResponse } from "@/utils/api";
import { GET_MOST_ORDERED_ITEMS } from "@/utils/APIConstant";
import { getApi } from "@/utils/common";
import React from "react";

interface MostOrderItem {
  quantity: number,
  title: string
}

export default function PopularItemsCard() {
  const [items,setItems] = React.useState<MostOrderItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  
    const fetch = async () => {
      setLoading(true);
      const response = await getApi<ApiResponse<MostOrderItem[]>>({
        url: GET_MOST_ORDERED_ITEMS
      });

      setLoading(false);
  
      if (response?.success) {
        setItems(response.data);
      }
    }

    React.useEffect(() => {
      fetch();
    },[])

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xl col-span-12 md:col-span-6 xl:col-span-4">

      {/* HEADER */}
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">
          Popular Items
        </h2>
        <p className="text-sm text-gray-500">
          Most ordered dishes
        </p>
      </div>

      {/* LIST */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <SkeletonRow key={index} />
          ))
        ) : items.length > 0 ? (
          items.map((item, index) => (
            <ItemRow
              key={item.title}
              index={index}
              name={item.title}
              count={item.quantity}
            />
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  )
}

function ItemRow({
  index,
  name,
  count,
}: {
  index: number
  name: string
  count: number
}) {
  return (
    <div className="group flex items-center justify-between rounded-xl px-3 py-3 hover:bg-gray-50 transition">
      <div className="flex items-center gap-3">
        {/* rank */}
        <span className="w-6 text-sm font-semibold text-gray-400">
          {index + 1}.
        </span>

        {/* name */}
        <span className="font-medium text-gray-800 truncate max-w-[140px]">
          {name}
        </span>
      </div>

      {/* count */}
      <span className="text-sm font-semibold text-indigo-600">
        {count} orders
      </span>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center justify-between rounded-xl px-3 py-3">
      <div className="flex items-center gap-3 w-full">
        <div className="h-4 w-4 rounded bg-gray-200" />
        <div className="h-4 w-32 rounded bg-gray-200" />
      </div>
      <div className="h-4 w-20 rounded bg-gray-200" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-8 text-gray-500 text-sm">
      No popular items yet
    </div>
  )
}
