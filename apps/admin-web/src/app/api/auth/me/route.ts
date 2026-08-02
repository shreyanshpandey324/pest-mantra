import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { AuthUser } from "@/types/auth";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const accessToken = req.cookies.get(ACCESS_COOKIE_NAME)?.value;

  if (!accessToken) {
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }

  try {
    const data = await backendFetch<{ user: AuthUser }>("/auth/me", { accessToken });
    return NextResponse.json({ success: true, message: "OK", data });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof BackendApiError ? err.message : "Not authenticated" },
      { status: err instanceof BackendApiError ? err.statusCode : 401 }
    );
  }
}
