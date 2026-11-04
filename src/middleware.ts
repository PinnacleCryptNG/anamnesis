import { NextResponse, type NextRequest } from "next/server";

// Optional demo gate: when APP_PASSCODE is set, writes and LLM calls need it.
const GATED = ["/api/intake", "/api/brief", "/api/ask", "/api/share"];

export function middleware(req: NextRequest) {
  const code = process.env.APP_PASSCODE;
  if (!code || req.method !== "POST" || !GATED.includes(req.nextUrl.pathname)) return NextResponse.next();
  if (req.headers.get("x-passcode") === code) return NextResponse.next();
  return NextResponse.json({ error: "passcode", message: "Enter the passcode to write to this record." }, { status: 401 });
}

export const config = { matcher: "/api/:path*" };
