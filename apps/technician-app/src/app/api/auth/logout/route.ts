import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend-client";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/session";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (refreshToken) {
    try {
      await backendFetch("/auth/logout", { method: "POST", body: { refreshToken } });
    } catch {
      // Intentionally swallowed — the user must not get stuck unable
      // to log out just because the backend is unreachable.
    }
  }

  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.delete(ACCESS_COOKIE_NAME);
  response.cookies.delete(REFRESH_COOKIE_NAME);
  return response;
