import { verifyAuth } from "@/middleware/auth";
import { Transaction } from "@/model/transations";
import { sendRJResponse } from "@/utils/api";
import { Types } from "mongoose";
import { NextRequest } from "next/server";

const getOrders = async (merchantId: Types.ObjectId) => {
    try {
        const query: Record<string, any> = { 
            merchantId: new Types.ObjectId(merchantId),
            status: "COMPLETED" 
        }


        const orders = await Transaction.aggregate([
            { $match: query },
            { $sort: { createdAt: -1 } },

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

            // Same two-stage merge as the paginated feed - one entry per dish,
            // with the quantity the whole table ordered.
            {
                $group: {
                    _id: { txn: "$_id", menu: "$menu._id" },
                    name: { $first: "$user.name" },
                    email: { $first: "$user.email" },
                    amount: { $first: "$amount" },
                    status: { $first: "$status" },
                    paymentId: { $first: "$razorpayOrderId" },
                    tableName: { $first: "$order.tableName" },
                    createdAt: { $first: "$createdAt" },
                    title: { $first: "$menu.title" },
                    quantity: { $sum: { $ifNull: ["$order.items.quantity", 1] } }
                }
            },

            {
                $group: {
                    _id: "$_id.txn",
                    name: { $first: "$name" },
                    email: { $first: "$email" },
                    amount: { $first: "$amount" },
                    status: { $first: "$status" },
                    paymentId: { $first: "$paymentId" },
                    tableName: { $first: "$tableName" },
                    items: { $push: { title: "$title", quantity: "$quantity" } },
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
        const merchantId = await verifyAuth(req) as Types.ObjectId;

        if (!merchantId) {
            return sendRJResponse({ success: false, status: 401, message: "Unauthorized" });
        }


        const orders = await getOrders(merchantId)
        return sendRJResponse({ success: true, status: 200, data: orders, message: "" })


    } catch (error) {
        console.error("Error while getting most Order Trends:", error);
        return sendRJResponse({ success: false, message: "Internal server error", status: 500 });
    }
}
