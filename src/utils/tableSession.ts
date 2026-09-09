import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { ITableSession, TableSession, TableSessionStatus } from "@/model/tableSession";

export const TABLE_SESSION_COOKIE = "table_session";

/** 6 hours - longer than any meal, short enough that a stale cookie expires. */
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 6;

export const setTableSessionCookie = (res: NextResponse, sessionId: string) => {
  res.cookies.set(TABLE_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
  return res;
};

export const clearTableSessionCookie = (res: NextResponse) => {
  res.cookies.set(TABLE_SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
};

/**
 * The live table session this request belongs to, or null when the customer
 * came through a plain link with no table (they then get their own cart).
 *
 * The cookie is only a pointer - membership is re-checked here on every call,
 * so a copied cookie cannot join someone else's table.
 */
export const resolveTableSession = async (
  req: NextRequest,
  userId: mongoose.Types.ObjectId | string
): Promise<ITableSession | null> => {
  const sessionId = req.cookies.get(TABLE_SESSION_COOKIE)?.value;

  if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) return null;

  const session = await TableSession.findOne({
    _id: sessionId,
    status: { $in: [TableSessionStatus.OPEN, TableSessionStatus.LOCKED] },
    "members.userId": new mongoose.Types.ObjectId(String(userId)),
  });

  return session;
};
