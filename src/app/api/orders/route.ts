import { verifyAuth } from "@/middleware/auth";
import { Order } from "@/model/order";
import { Transaction } from "@/model/transations";
import { sendRJResponse } from "@/utils/api";
import { Types } from "mongoose";
import { NextRequest } from "next/server";


const getOrders = async (merchantId: Types.ObjectId, lastCursor: string | null, limit: number = 20) => {
    try {
        const query: Record<string, any> = { 
            merchantId: new Types.ObjectId(merchantId),
            status: "COMPLETED" 
        }

        if (lastCursor) {
            const date = new Date(lastCursor);
            if (!isNaN(date.getTime())) {
                query.createdAt = { $lt: date }
            }
        }

        const orders = await Transaction.aggregate([
            { $match: query },
            { $sort: { createdAt: -1 } },
            { $limit: limit+1 },

            {
                $lookup: {
                    from: "merchants",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                }
            },

            { $unwind: "$user" },

            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "order"
                }
            },

            { $unwind: "$order" },
            { $unwind: "$order.items" },

            {
                $lookup: {
                    from: "menus",
                    localField: "order.items.item",
                    foreignField: "_id",
                    as: "menu"
                }
            },

            { $unwind: "$menu" },

            {
                $group: {
                    _id: "$_id",
                    name: { $first: "$user.name" },
                    email: { $first: "$user.email" },
                    amount: { $first: "$amount" },
                    status: { $first: "$status" },
                    paymentId: { $first: "$razorpayOrderId" },
                    items: { $push: "$menu.title" },
                    createdAt: { $first: "$createdAt" }
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        const hasMore = orders.length > limit
        if (hasMore) orders.pop();
        
        return {
            hasMore: hasMore,
            orders: orders
        };
    } catch (error) {
        console.error("Error while getting Order history: ", error);
    }
}

export async function GET(req: NextRequest) {
    try {
        const merchantId = await verifyAuth(req) as Types.ObjectId;

        if (!merchantId) {
            return sendRJResponse({ success: false, status: 401, message: "Unauthorized" });
        }

        const parmas = req.nextUrl.searchParams;
        const lastCursor = parmas.get("cursor");
        const limit = parmas.get("limit") || 20;

        const orders = await getOrders(merchantId,lastCursor , Number(limit))
        return sendRJResponse({ success: true, status: 200, data: orders, message: "" })


    } catch (error) {
        console.error("Error while getting most Order Trends:", error);
        return sendRJResponse({ success: false, message: "Internal server error", status: 500 });
    }
}
