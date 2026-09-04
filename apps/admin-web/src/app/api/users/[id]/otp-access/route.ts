import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { AuthUser } from "@/types/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;

  const { id } = await context.params;
  let enabled: unknown;
  try {
    enabled = (await req.json()).enabled;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  if (typeof enabled !== "boolean") {
    return NextResponse.json({ success: false, message: "enabled must be a boolean" }, { status: 400 });
  }

  try {
    const data = await backendFetch<{ user: AuthUser }>(`/users/${id}/otp-access`, {
      method: "PATCH",
      body: { enabled },
      accessToken: token,
    });

    return NextResponse.json({ success: true, message: "OTP login access updated", data });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof BackendApiError ? err.message : "Unable to update OTP access.",
      },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}
