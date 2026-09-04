import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = requireAccessToken(req); if (token instanceof NextResponse) return token;
  const { id } = await context.params;
  let body: unknown = {}; try { body = await req.json(); } catch { /* empty */ }
  try { const data = await backendFetch(`/communications/from-alert/${encodeURIComponent(id)}`, { method: "POST", body, accessToken: token }); return NextResponse.json({ success: true, message: "Delivery queued", data }); }
  catch (err) { return NextResponse.json({ success: false, message: err instanceof BackendApiError ? err.message : "Could not queue delivery" }, { status: err instanceof BackendApiError ? err.statusCode : 502 }); }
}
