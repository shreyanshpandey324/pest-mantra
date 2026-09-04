import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { accessCookieOptions, refreshCookieOptions } from "@/lib/session";
import { ADMIN_WEB_ROLES, LoginResponseData } from "@/types/auth";

const ACCESS_TOKEN_MAX_AGE = 15 * 60;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

export async function POST(req: NextRequest): Promise<NextResponse> {
  let idToken: unknown;
  try {
    idToken = (await req.json()).idToken;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json({ success: false, message: "OTP verification token is required" }, { status: 400 });
  }

  try {
    const data = await backendFetch<LoginResponseData>("/auth/otp/verify", {
      method: "POST",
      body: { idToken, audience: "admin" },
    });

    if (!ADMIN_WEB_ROLES.includes(data.user.role)) {
      return NextResponse.json(
        { success: false, message: "This account does not have access to the admin dashboard." },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      data: { user: data.user },
    });
    response.cookies.set({ ...accessCookieOptions(ACCESS_TOKEN_MAX_AGE), value: data.accessToken });
    response.cookies.set({ ...refreshCookieOptions(REFRESH_TOKEN_MAX_AGE), value: data.refreshToken });
    return response;
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof BackendApiError ? err.message : "Unable to reach the server. Please try again.",
      },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}
