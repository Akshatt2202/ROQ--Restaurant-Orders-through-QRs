import { verifyAuth } from "@/middleware/auth";
import { Order } from "@/model/order";
import { Transaction, TransactionStatus } from "@/model/transations";
import { VisitorModel } from "@/model/visitors";
import { sendRJResponse } from "@/utils/api";
import mongoose, { Types } from "mongoose";
import { NextRequest } from "next/server";

const getOrders = async (merchantId: mongoose.Types.ObjectId) => {
    try {
        const prevWeekCap = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const prevWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const orders = await Transaction.aggregate([
            { $match: { merchantId: new mongoose.Types.ObjectId(merchantId), status: TransactionStatus.COMPLETED } },

            {
                $group: {
                    _id: null,

                    prevWeekOrders: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gte: ["$createdAt", prevWeekCap] },
                                        { $lte: ["$createdAt", prevWeek] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },

                    currWeekOrders: {
                        $sum: {
                            $cond: [
                                { $gt: ["$createdAt", prevWeek] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },

            {
                $addFields: {
                    trend: { $subtract: ["$currWeekOrders", "$prevWeekOrders"] }
                }
            },

            {
                $project: {
                    currWeekOrders: 1,
                    trend: 1
                }
            }
        ]);

        return orders[0];
    } catch (error) {
        console.error("Error while getting orderes", error);
    }
}

const getVisitors = async (merchantId: mongoose.Types.ObjectId) => {
    try {
        const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const id = new mongoose.Types.ObjectId(merchantId)
        const visiters = await VisitorModel.aggregate([
            { $match: { merchantId: id, createdAt: { $gt: week } } },
            { $count: "visitor" }
        ])

        return visiters[0]?.visitor ?? 0;

    } catch (error) {
        console.error("Error while getting Visitors count", error);
    }
}

const getRevenue = async (merchantId: mongoose.Types.ObjectId) => {
    try {
        const today = new Date();
        const prevMonth = new Date(today.setMonth(today.getMonth() - 1));

        const revenue = await Transaction.aggregate([
            { $match: { status: TransactionStatus.COMPLETED, merchantId: new mongoose.Types.ObjectId(merchantId) } },
            {
                $group: {
                    _id: null, totalSum: {
                        $sum: "$amount"
                    },

                    thisMonthSails: {
                        $sum: {
                            $cond: [
                                { $gte: ["$createdAt", prevMonth] },
                                "$amount",
                                0
                            ]
                        }
                    }
                }
            }
        ])
        return revenue[0];
    } catch (error) {
        console.error("Error while getting Revenue", error);
    }
}

export const getMostOrderedItem = async (merchantId: Types.ObjectId) => {
    try {
        const mostOrderedItems = await Transaction.aggregate([
            { $match: { status: TransactionStatus.COMPLETED, merchantId: new Types.ObjectId(merchantId) } },

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
                $group: {
                    _id: "$order.items.item",
                    quantity: { $sum: "$order.items.quantity" }
                }
            },

            {
                $lookup: {
                    from: "menus",
                    localField: "_id",
                    foreignField: "_id",
                    as: "menu"
                }
            },

            { $unwind: "$menu" },

            {
                $project: {
                    _id: 0,
                    title: "$menu.title",
                    image: "$menu.image",
                    quantity: 1
                }
            },

            { $sort: { quantity: -1 } },

            { $limit: 4 }
        ]);

        return mostOrderedItems;
    } catch (error) {
        console.error("Error while getting Revenue", error);
    }
}

export async function GET(req: NextRequest) {
    try {
        const merchantId = await verifyAuth(req) as mongoose.Types.ObjectId;

        if (!merchantId) {
            return sendRJResponse({ success: false, status: 401, message: "Unauthorized" });
        }

        const [orderCount, revenue, visitor, mostOrdered] = await Promise.all([
            await getOrders(merchantId),
            await getRevenue(merchantId),
            await getVisitors(merchantId),
            await getMostOrderedItem(merchantId)
        ])

        return sendRJResponse({
            success: true, message: "dashboard matrices fetched successfully", data: {
                orders: orderCount,
                revenue: revenue,
                visitor: visitor,
                mostOrdered: mostOrdered?.length ? mostOrdered[0] : null
            }
        })


    } catch (error) {
        console.error("Error while getting dashboard matrices:", error);
        return sendRJResponse({ success: false, message: "Internal server error", status: 500 });
    }
}