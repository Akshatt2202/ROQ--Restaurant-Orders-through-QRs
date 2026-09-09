import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { verifyAuth } from "@/middleware/auth";
import { sendRJResponse } from "@/utils/api";
import { TableSession, TableSessionStatus } from "@/model/tableSession";
import { resolveTableSession } from "@/utils/tableSession";

/**
 * Hand the table back after a cancelled or failed payment, so someone else can
 * pay. Only the member holding the lock can release it.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);

    if (!userId || userId instanceof NextResponse) {
      return sendRJResponse({ success: false, message: "Unauthorized", status: 401 });
    }

    const session = await resolveTableSession(req, userId as mongoose.Types.ObjectId);

    if (!session) {
      return sendRJResponse({ success: true, message: "No table session", status: 200 });
    }

    await TableSession.updateOne(
      {
        _id: session._id,
        status: TableSessionStatus.LOCKED,
        lockedBy: new mongoose.Types.ObjectId(String(userId)),
      },
      { $set: { status: TableSessionStatus.OPEN }, $unset: { lockedBy: 1 }, $inc: { version: 1 } }
    );

    return sendRJResponse({ success: true, message: "Table released", status: 200 });
  } catch (error) {
    console.error("Error while releasing table session:", error);
    return sendRJResponse({ success: false, message: "Internal server error", status: 500 });
  }
}
