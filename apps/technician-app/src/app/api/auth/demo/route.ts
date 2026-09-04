import { NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { accessCookieOptions, refreshCookieOptions } from "@/lib/session";
import { TECHNICIAN_APP_ROLES, LoginResponseData } from "@/types/auth";

const ACCESS_TOKEN_MAX_AGE = 15 * 60;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

export async function POST(): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, message: "Demo mode is disabled" }, { status: 404 });
  }

  try {
    const data = await backendFetch<LoginResponseData>("/auth/demo-login", { method: "POST" });

    if (!TECHNICIAN_APP_ROLES.includes(data.user.role)) {
      return NextResponse.json(
        { success: false, message: "No technician account is available for demo mode." },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Demo session started",
      data: { user: data.user },
    });

    response.cookies.set({ ...accessCookieOptions(ACCESS_TOKEN_MAX_AGE), value: data.accessToken });
    response.cookies.set({ ...refreshCookieOptions(REFRESH_TOKEN_MAX_AGE), value: data.refreshToken });
    return response;
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof BackendApiError ? err.message : "Unable to start demo session.",
      },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}
