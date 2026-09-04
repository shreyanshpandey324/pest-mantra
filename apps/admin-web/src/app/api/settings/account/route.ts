import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 }); }
  try {
    const data = await backendFetch("/settings/account", { method: "PATCH", body, accessToken: token });
    return NextResponse.json({ success: true, data, message: "Account updated successfully" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err instanceof BackendApiError ? err.message : "Unable to update account.", details: err instanceof BackendApiError ? err.details : undefined }, { status: err instanceof BackendApiError ? err.statusCode : 502 });
  }
}
