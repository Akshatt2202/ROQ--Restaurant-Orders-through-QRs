import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { verifyAuth } from "@/middleware/auth";
import { sendRJResponse } from "@/utils/api";
import { Cart } from "@/model/cart";
import { Merchants } from "@/model/merchants";
import { buildActiveKey, TableSession, TableSessionStatus } from "@/model/tableSession";
import {
  resolveTableSession,
  setTableSessionCookie,
} from "@/utils/tableSession";

const serialise = (session: any, userId: string, cartVersion: number) => ({
  sessionId: String(session._id),
  tableName: session.tableName,
  status: session.status,
  version: session.version,
  cartVersion,
  lockedByMe: session.lockedBy ? String(session.lockedBy) === userId : false,
  lockedByName: session.lockedBy
    ? session.members.find((m: any) => String(m.userId) === String(session.lockedBy))?.name || "Someone"
    : null,
  members: session.members.map((m: any) => ({
    userId: String(m.userId),
    name: m.name,
    isMe: String(m.userId) === userId,
  })),
});

const cartVersionOf = async (sessionId: mongoose.Types.ObjectId) => {
  const cart = await Cart.findOne({ sessionId }, { version: 1 }).lean<{ version?: number }>();
  return cart?.version ?? 0;
};

/** Join (or open) the live session for a table. Called when a QR is scanned. */
export async function POST(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);

    if (!userId || userId instanceof NextResponse) {
      return sendRJResponse({ success: false, message: "Unauthorized", status: 401 });
    }

    const { merchantId, tableName } = await req.json();

    if (!merchantId || !tableName || !mongoose.Types.ObjectId.isValid(merchantId)) {
      return sendRJResponse({ success: false, message: "Merchant and table are required", status: 400 });
    }

    const cleanTable = String(tableName).trim().slice(0, 100);
    if (!cleanTable) {
      return sendRJResponse({ success: false, message: "Invalid table", status: 400 });
    }

    const activeKey = buildActiveKey(String(merchantId), cleanTable);

    let session;
    try {
      // Upsert is atomic, so simultaneous scanners converge on one session.
      session = await TableSession.findOneAndUpdate(
        { activeKey },
        {
          $setOnInsert: {
            merchantId: new mongoose.Types.ObjectId(String(merchantId)),
            tableName: cleanTable,
            activeKey,
            status: TableSessionStatus.OPEN,
            members: [],
            version: 0,
          },
        },
        { new: true, upsert: true }
      );
    } catch (error: any) {
      // Lost the unique-index race - the winner's session is now there.
      if (error?.code !== 11000) throw error;
      session = await TableSession.findOne({ activeKey });
    }

    if (!session) {
      return sendRJResponse({ success: false, message: "Could not open the table", status: 500 });
    }

    const alreadyIn = session.members.some(
      (m: any) => String(m.userId) === String(userId)
    );

    if (!alreadyIn) {
      const user = await Merchants.findById(userId, { name: 1 });

      // Guarded by the same $ne, so a double-tap cannot add a member twice.
      await TableSession.updateOne(
        { _id: session._id, "members.userId": { $ne: new mongoose.Types.ObjectId(String(userId)) } },
        {
          $push: {
            members: {
              userId: new mongoose.Types.ObjectId(String(userId)),
              name: user?.name || "Guest",
              joinedAt: new Date(),
            },
          },
          $inc: { version: 1 },
        }
      );

      session = await TableSession.findById(session._id);
    }

    const res = sendRJResponse({
      success: true,
      message: "Joined table",
      status: 200,
      data: serialise(session, String(userId), await cartVersionOf(session._id)),
    });

    return setTableSessionCookie(res, String(session._id));
  } catch (error) {
    console.error("Error while joining table session:", error);
    return sendRJResponse({ success: false, message: "Internal server error", status: 500 });
  }
}

/** Cheap poll: who is at the table, is it locked, and has the cart changed. */
export async function GET(req: NextRequest) {
  try {
    const userId = await verifyAuth(req);

    if (!userId || userId instanceof NextResponse) {
      return sendRJResponse({ success: false, message: "Unauthorized", status: 401 });
    }

    const session = await resolveTableSession(req, userId as mongoose.Types.ObjectId);

    if (!session) {
      return sendRJResponse({ success: true, message: "No table session", status: 200, data: null });
    }

    return sendRJResponse({
      success: true,
      message: "",
      status: 200,
      data: serialise(session, String(userId), await cartVersionOf(session._id)),
    });
  } catch (error) {
    console.error("Error while reading table session:", error);
    return sendRJResponse({ success: false, message: "Internal server error", status: 500 });
  }
}
