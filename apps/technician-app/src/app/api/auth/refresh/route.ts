import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { accessCookieOptions, refreshCookieOptions, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/session";
import { LoginResponseData } from "@/types/auth";

const ACCESS_TOKEN_MAX_AGE = 15 * 60;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (!refreshToken) {
    return NextResponse.json({ success: false, message: "No active session" }, { status: 401 });
  }

  try {
    const data = await backendFetch<LoginResponseData>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    });

    const response = NextResponse.json({
      success: true,
      message: "Session refreshed",
      data: { user: data.user },
    });

    response.cookies.set({ ...accessCookieOptions(ACCESS_TOKEN_MAX_AGE), value: data.accessToken });
    response.cookies.set({ ...refreshCookieOptions(REFRESH_TOKEN_MAX_AGE), value: data.refreshToken });

    return response;
  } catch (err) {
    const response = NextResponse.json(
      { success: false, message: err instanceof BackendApiError ? err.message : "Session expired" },
      { status: err instanceof BackendApiError ? err.statusCode : 401 }
    );
    response.cookies.delete(ACCESS_COOKIE_NAME);
    response.cookies.delete(REFRESH_COOKIE_NAME);
    return response;
  }
}
