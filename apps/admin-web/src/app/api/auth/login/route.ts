import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { accessCookieOptions, refreshCookieOptions } from "@/lib/session";
import { ADMIN_WEB_ROLES, LoginResponseData } from "@/types/auth";

const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes, mirrors backend JWT_ACCESS_EXPIRES_IN
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days, mirrors backend JWT_REFRESH_EXPIRES_IN

export async function POST(req: NextRequest): Promise<NextResponse> {
  let phone: unknown;
  let password: unknown;

  try {
    const body = await req.json();
    phone = body.phone;
    password = body.password;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  if (typeof phone !== "string" || typeof password !== "string" || !phone || !password) {
    return NextResponse.json(
      { success: false, message: "Phone and password are required" },
      { status: 400 }
    );
  }

  try {
    const data = await backendFetch<LoginResponseData>("/auth/login", {
      method: "POST",
      body: { phone, password },
    });

    // This dashboard is admin-only. A technician account is valid on
    // the backend but has no business getting a session cookie here —
    // the technician mobile app is a separate client entirely.
    if (!ADMIN_WEB_ROLES.includes(data.user.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "This account does not have access to the admin dashboard.",
        },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      data: { user: data.user },
    });

    response.cookies.set({
      ...accessCookieOptions(ACCESS_TOKEN_MAX_AGE),
      value: data.accessToken,
    });
    response.cookies.set({
      ...refreshCookieOptions(REFRESH_TOKEN_MAX_AGE),
      value: data.refreshToken,
    });

    return response;
  } catch (err) {
    if (err instanceof BackendApiError) {
      return NextResponse.json({ success: false, message: err.message }, { status: err.statusCode });
    }
    return NextResponse.json(
      { success: false, message: "Unable to reach the server. Please try again." },
      { status: 502 }
    );
  }
}
