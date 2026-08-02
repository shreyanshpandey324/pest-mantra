import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME } from "./session";

/**
 * Same helper as admin-web's require-token.ts — every data route
 * handler needs the caller's access token from the httpOnly
 * cookie, or a 401 if it's missing.
 */
export function requireAccessToken(req: NextRequest): string | NextResponse {
  const token = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }
  return token;
}
