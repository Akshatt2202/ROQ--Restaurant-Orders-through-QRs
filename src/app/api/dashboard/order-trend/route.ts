import { verifyAuth } from "@/middleware/auth";
import { Transaction, TransactionStatus } from "@/model/transations";
import { sendRJResponse } from "@/utils/api";
import { Types } from "mongoose";
import { NextRequest } from "next/server";

const getTrends = async (merchantId: Types.ObjectId) => {
    try {
        const weekAgo = new Date(Date.now() - 7*24*60*60*1000)
        const ordersPerDay = await Transaction.aggregate([
            {
                $match: {
                    merchantId: new Types.ObjectId(merchantId), 
                    status: TransactionStatus.COMPLETED,
                    $expr: {
                        $gte: ["$createdAt", weekAgo]
                    }
                }
            },
            {
                $group: {
                    _id: { $dayOfWeek: "$createdAt" },
                    orders: { $sum: 1 }
                }
            },

            {
                $project: {
                    _id: 0,
                    dayNumber: "$_id",
                    orders: 1
                }
            },

            {
                $addFields: {
                    day: {
                        $arrayElemAt: [
                            ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                            { $subtract: ["$dayNumber", 1] }
                        ]
                    }
                }
            },

            { $project: { day: 1, orders: 1 } },

            { $sort: { day: 1 } }
        ]);

        return ordersPerDay;
    } catch (error) {
        console.error("Error while getting Order Trends", error);
    }
}

export async function GET(req: NextRequest) {
    try {
        const merchantId = await verifyAuth(req) as Types.ObjectId;

        if (!merchantId) {
            return sendRJResponse({ success: false, status: 401, message: "Unauthorized" });
        }
        const trends = await getTrends(merchantId)
        return sendRJResponse({
            success: true,
            message: "sucessfully fetched most orderd trends",
            data: trends,
            status: 200
        })
    } catch (error) {
        console.error("Error while getting most Order Trends:", error);
        return sendRJResponse({ success: false, message: "Internal server error", status: 500 });
    }
}