import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";

export async function GET(req: NextRequest) {
  const token = requireAccessToken(req); if (token instanceof NextResponse) return token;
  try { const data = await backendFetch<Record<string, unknown>>("/communications/status", { accessToken: token }); return NextResponse.json({ success: true, data }); }
  catch (err) { return NextResponse.json({ success: false, message: err instanceof BackendApiError ? err.message : "Could not load communication status" }, { status: err instanceof BackendApiError ? err.statusCode : 502 }); }
}
