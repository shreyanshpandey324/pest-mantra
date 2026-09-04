import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;

  const { id } = await context.params;
  let password: unknown;
  try {
    password = (await req.json()).password;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { success: false, message: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  try {
    await backendFetch(`/users/${id}/password`, {
      method: "PATCH",
      body: { password },
      accessToken: token,
    });

    return NextResponse.json({
      success: true,
      message: "Office Admin password updated successfully",
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof BackendApiError ? err.message : "Unable to update password.",
      },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}
