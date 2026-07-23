"use client"

import { OrderHistory } from "@/types/orderHistory"
import { ApiResponse } from "@/utils/api";
import { GET_TRANSACTION_HISTORY } from "@/utils/APIConstant";
import { getApi } from "@/utils/common";
import React from "react"

function index() {
    const [his, setHis] = React.useState<OrderHistory[]>([]);

    const fetch = async () => {
        const response = await getApi<ApiResponse<OrderHistory[]>>({
            url: GET_TRANSACTION_HISTORY
        })

        if (response?.success) {
            setHis(response.data)
        }
    }

    React.useEffect(() => {
        fetch()
    },[])

    return (
        <div className="min-h-screen bg-gray-50 px-6 pt-20">
            {/* Header */}
            <h1 className="mb-6 font-mono text-2xl text-zinc-950">
                Transaction History
            </h1>

            {/* Transactions */}
            <div className="flex flex-col gap-4">
                {his.map((txn) => (
                    <div
                        key={txn._id}
                        className="rounded-2xl bg-white p-4 shadow-sm hover:shadow-md transition"
                    >
                        {/* Merchant Info */}
                        <div className="mb-2">
                            <p className="text-sm font-semibold text-gray-900">
                                {txn.name}
                            </p>
                            <p className="text-xs text-gray-500">
                                {txn.email}
                            </p>
                        </div>

                        <div className="text-xs text-blue-600">
                            {String(txn.items)}
                        </div>

                        {/* Transaction Meta */}
                        <div className="flex items-center justify-between text-sm">
                            <div className="space-y-1">
                                <p className="text-xs text-gray-500">
                                    Transaction ID
                                </p>
                                <p className="font-mono text-xs text-gray-800">
                                    {txn.paymentId}
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="font-semibold text-gray-900">
                                    ₹{txn.amount}
                                </p>
                                <p
                                    className={`text-xs font-medium ${txn.status === "COMPLETED"
                                            ? "text-green-600"
                                            : "text-red-600"
                                        }`}
                                >
                                    {txn.status}
                                </p>
                            </div>
                        </div>

                        {/* Date */}
                        <p className="mt-2 text-xs text-gray-400">
                            {new Date(txn.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default index
