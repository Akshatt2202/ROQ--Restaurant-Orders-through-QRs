// QR codes are printed, so this must be the public origin in production - a
// code generated against localhost is worthless the moment it leaves this
// machine. Set NEXT_PUBLIC_APP_URL (no trailing slash) wherever you deploy.
export const AppUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000"
