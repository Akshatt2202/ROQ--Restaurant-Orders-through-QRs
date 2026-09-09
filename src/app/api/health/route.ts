import { NextResponse } from "next/server";
import mongoServer from "@/config/mongoConfig";

/**
 * Deployment probe. Reports whether each expected variable is *present* (never
 * its value) and whether the database actually answers, so a broken deploy can
 * be diagnosed from the browser instead of from CloudWatch.
 *
 * Safe to delete once the environment is settled.
 */
const REQUIRED = [
  "MONGO_URI",
  "JWT_SECRET",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "NEXT_PUBLIC_RAZORPAY_KEY_ID",
  "NEXT_PUBLIC_APP_URL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

export async function GET() {
  const env = Object.fromEntries(
    REQUIRED.map((key) => [key, Boolean(process.env[key])])
  );

  const startedAt = Date.now();
  let database = "connected";
  let reason: string | null = null;

  try {
    await mongoServer();
  } catch (error) {
    database = "failed";

    // A configuration error names the missing variable and leaks nothing. Any
    // other failure reports only the error class - the message can carry the
    // cluster hostname, which does not belong in a public response.
    reason =
      error instanceof Error && error.message.startsWith("MONGO_URI")
        ? error.message
        : (error as Error)?.name || "UnknownError";
  }

  return NextResponse.json(
    { database, reason, tookMs: Date.now() - startedAt, env },
    { status: database === "connected" ? 200 : 503 }
  );
}
