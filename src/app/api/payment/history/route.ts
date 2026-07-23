import { verifyAuth } from "@/middleware/auth";
import { Transaction } from "@/model/transations";
import { sendRJResponse } from "@/utils/api";
import { Types } from "mongoose";
import { NextRequest } from "next/server";

const getOrders = async (userId: Types.ObjectId) => {
    try {
        const query: Record<string, any> = { userId: new Types.ObjectId(userId) }


        const orders = await Transaction.aggregate([
            { $match: query },
            { $sort: { createdAt: -1 } },

            {
                $lookup: {
                    from: "merchants",
                    localField: "merchantId",
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


        
        return orders;
    } catch (error) {
        console.error("Error while getting Order history: ", error);
    }
}

export async function GET(req: NextRequest) {
    try {
        const userId = await verifyAuth(req) as Types.ObjectId;

        if (!userId) {
            return sendRJResponse({ success: false, status: 401, message: "Unauthorized" });
        }


        const orders = await getOrders(userId)
        return sendRJResponse({ success: true, status: 200, data: orders, message: "" })


    } catch (error) {
        console.error("Error while getting most Order Trends:", error);
        return sendRJResponse({ success: false, message: "Internal server error", status: 500 });
    }
}
