import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend-client";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/session";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

  // Best-effort: tell the backend to revoke the refresh token so it
  // can't be replayed even if it leaked. If this call fails, we
  // still clear the local cookies below — the user must not get
  // stuck unable to log out just because the backend is down.
  if (refreshToken) {
    try {
      await backendFetch("/auth/logout", { method: "POST", body: { refreshToken } });
    } catch {
      // Intentionally swallowed — see comment above.
    }
  }

  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.delete(ACCESS_COOKIE_NAME);
  response.cookies.delete(REFRESH_COOKIE_NAME);
  return response;
}
