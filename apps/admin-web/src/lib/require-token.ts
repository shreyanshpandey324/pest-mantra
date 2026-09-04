import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME } from "./session";

/**
 * Every data route handler under /api/** (projects, technicians,
 * etc.) needs the same thing first: the caller's access token from
 * the httpOnly cookie, or a 401 if it's missing. One helper, reused
 * everywhere, instead of five copies of the same three lines.
 */
export function requireAccessToken(req: NextRequest): string | NextResponse {

  const token = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }
  return token;
}
