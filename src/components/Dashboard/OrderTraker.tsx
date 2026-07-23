"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import React from "react"
import { getApi } from "@/utils/common"
import { ApiResponse } from "@/utils/api"
import { GET_ORDER_TRENS } from "@/utils/APIConstant"

interface OrderTrends { day: string; orders: number }

export default function OrderTrackingChart() {
  const [trends,setTrends] = React.useState<OrderTrends[]>([])

  const fetch = async () => {
    const response = await getApi<ApiResponse<OrderTrends[]>>({
      url: GET_ORDER_TRENS
    });

    if (response?.success) {
      setTrends(response.data);
    }
  }

  React.useEffect(() => {
    fetch()
  },[])
  return (
    <div className="col-span-12 xl:col-span-8 bg-white rounded-2xl p-6 shadow-xl">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Orders Trend
          </h2>
          <p className="text-sm text-gray-500">
            Last 7 days performance
          </p>
        </div>
      </div>

      {/* CHART */}
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={trends}
            margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
          >
            {/* soft grid */}
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E5E7EB"
            />

            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fill: "#6B7280" }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fontSize: 12, fill: "#6B7280" }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                border: "1px solid #E5E7EB",
                boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                fontSize: "12px",
              }}
              labelStyle={{ fontWeight: 600 }}
            />

            <Line
              type="monotone"
              dataKey="orders"
              stroke="#6366F1"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
