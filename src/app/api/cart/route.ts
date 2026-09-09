import { verifyAuth } from "@/middleware/auth";
import { Cart } from "@/model/cart";
import { TableSessionStatus } from "@/model/tableSession";
import { sendRJResponse } from "@/utils/api";
import { resolveTableSession } from "@/utils/tableSession";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

/**
 * A shared table cart lives on the session; a solo customer keeps their own.
 * Both shapes are read and written through this one filter.
 */
const cartFilter = (session: any, userId: mongoose.Types.ObjectId) =>
    session
        ? { sessionId: session._id }
        : { userId: new mongoose.Types.ObjectId(String(userId)) };

export async function GET(req: NextRequest) {
    try {
        const userId = await verifyAuth(req);

        if (!userId || userId instanceof NextResponse) {
            return sendRJResponse({
                success: false,
                message: "Unauthorized",
                status: 401,
            });
        }

        const me = new mongoose.Types.ObjectId(String(userId));
        const session = await resolveTableSession(req, me);

        const cartData = await Cart.aggregate([
            { $match: cartFilter(session, me) },
            { $unwind: "$items" },

            // Lines written before per-person carts existed belong to the owner.
            {
                $addFields: {
                    "items.owner": { $ifNull: ["$items.addedBy", "$userId"] }
                }
            },

            {
                $lookup: {
                    from: "menus",
                    localField: "items.item",
                    foreignField: "_id",
                    as: "menuDetails"
                }
            },
            { $unwind: "$menuDetails" },

            {
                $lookup: {
                    from: "merchants",
                    localField: "items.owner",
                    foreignField: "_id",
                    as: "ownerDetails"
                }
            },

            {
                $group: {
                    _id: "$menuDetails._id",
                    merchantId: { $first: "$menuDetails.merchantId" },
                    title: { $first: "$menuDetails.title" },
                    price: { $first: "$menuDetails.price" },
                    originalPrice: { $first: "$menuDetails.originalPrice" },
                    image: { $first: "$menuDetails.image" },
                    quantity: { $first: "$menuDetails.quantity" },
                    section: { $first: "$menuDetails.section" },
                    createdAt: { $first: "$menuDetails.createdAt" },
                    updatedAt: { $first: "$menuDetails.updatedAt" },

                    // What this customer may edit...
                    itemCount: {
                        $sum: {
                            $cond: [{ $eq: ["$items.owner", me] }, "$items.quantity", 0]
                        }
                    },
                    // ...and what the whole table is actually ordering.
                    tableCount: { $sum: "$items.quantity" },

                    contributors: {
                        $push: {
                            name: {
                                $ifNull: [{ $arrayElemAt: ["$ownerDetails.name", 0] }, "Guest"]
                            },
                            quantity: "$items.quantity",
                            isMe: { $eq: ["$items.owner", me] }
                        }
                    }
                }
            },
            { $sort: { title: 1 } }
        ]);

        return sendRJResponse({
            success: true,
            message: "cart fetched successfully",
            data: cartData,
            status: 200,
        });
    } catch (error) {
        console.error("Error while fetching cart:", error);

        return sendRJResponse({
            success: false,
            message: "Internal server error",
            status: 500,
        });
    }
}

export async function POST(req: NextRequest) {
    try {
        const userId = await verifyAuth(req);

        if (!userId || userId instanceof NextResponse) {
            return sendRJResponse({ success: false, message: "Unauthorized", status: 401 });
        }

        const { itemId, quantity } = await req.json();

        if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
            return sendRJResponse({ success: false, message: "Invalid Item or Quantity", status: 400 });
        }

        const me = new mongoose.Types.ObjectId(String(userId));
        const session = await resolveTableSession(req, me);

        if (session?.status === TableSessionStatus.LOCKED) {
            return sendRJResponse({
                success: false,
                message: "Someone at your table is placing the order",
                status: 409,
            });
        }

        const filter = cartFilter(session, me);
        const item = new mongoose.Types.ObjectId(String(itemId));
        const qty = Number(quantity);

        // Every write below is a single atomic update. The old read-modify-write
        // (findOne -> mutate -> save) lost updates whenever two people at the
        // same table changed the cart within the same round trip.
        if (!qty || qty <= 0) {
            await Cart.updateOne(filter, {
                $pull: { items: { item, addedBy: me } },
                $inc: { version: 1 },
            });
        } else {
            const updated = await Cart.updateOne(
                {
                    ...filter,
                    items: {
                        $elemMatch: {
                            item,
                            $or: [{ addedBy: me }, { addedBy: { $exists: false } }],
                        },
                    },
                },
                { $set: { "items.$.quantity": qty, "items.$.addedBy": me }, $inc: { version: 1 } }
            );

            if (updated.matchedCount === 0) {
                // No line of mine for this item yet - add one. The upsert copies
                // userId/sessionId from the filter, so the cart is created if
                // this is the first item at the table.
                await Cart.updateOne(
                    filter,
                    { $push: { items: { item, quantity: qty, addedBy: me } }, $inc: { version: 1 } },
                    { upsert: true }
                );
            }
        }

        const cart = await Cart.findOne(filter, { version: 1, items: 1 });

        return sendRJResponse({
            success: true,
            message: "Cart updated successfully",
            data: cart,
            status: 200,
        });

    } catch (error) {
        console.error("Error while modifying cart:", error);
        return sendRJResponse({ success: false, message: "Internal server error", status: 500 });
    }
}
