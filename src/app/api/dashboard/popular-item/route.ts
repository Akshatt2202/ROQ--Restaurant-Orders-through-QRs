import { verifyAuth } from "@/middleware/auth";
import { sendRJResponse } from "@/utils/api";
import { Types } from "mongoose";
import { NextRequest } from "next/server"
import { getMostOrderedItem } from "../matrices/route";

export async function GET(req: NextRequest) {
    try {
        const merchantId = await verifyAuth(req) as Types.ObjectId;

        if (!merchantId) {
            return sendRJResponse({ success: false, status: 401, message: "Unauthorized" });
        }

        const mostOrderedItems = await getMostOrderedItem(merchantId);

        return sendRJResponse({
            success: true,
            message: "sucessfully fetched most orderd Items",
            data: mostOrderedItems,
            status: 200
        })
    } catch (error) {
        console.error("Error while getting most ordered Items:", error);
        return sendRJResponse({ success: false, message: "Internal server error", status: 500 });
    }
}