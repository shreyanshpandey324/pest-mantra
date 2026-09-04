import { NextRequest, NextResponse } from "next/server";
import { BackendApiError, backendFetch } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { Lead } from "@/types/lead";

type Context = { params: Promise<{ id: string }> };
function failure(error: unknown, fallback: string) {
  return NextResponse.json({ success: false, message: error instanceof BackendApiError ? error.message : fallback }, { status: error instanceof BackendApiError ? error.statusCode : 502 });
}
export async function GET(req: NextRequest, { params }: Context) {
  const token = requireAccessToken(req); if (token instanceof NextResponse) return token;
  try { const { id } = await params; return NextResponse.json({ success: true, data: await backendFetch<{ lead: Lead }>(`/leads/${id}`, { accessToken: token }) }); }
  catch (error) { return failure(error, "Could not load lead"); }
}
export async function PATCH(req: NextRequest, { params }: Context) {
  const token = requireAccessToken(req); if (token instanceof NextResponse) return token;
  try { const { id } = await params; return NextResponse.json({ success: true, data: await backendFetch<{ lead: Lead }>(`/leads/${id}`, { method: "PATCH", accessToken: token, body: await req.json() }) }); }
  catch (error) { return failure(error, "Could not update lead"); }
}
export async function DELETE(req: NextRequest, { params }: Context) {
  const token = requireAccessToken(req); if (token instanceof NextResponse) return token;
  try { const { id } = await params; await backendFetch(`/leads/${id}`, { method: "DELETE", accessToken: token }); return NextResponse.json({ success: true }); }
  catch (error) { return failure(error, "Could not delete lead"); }
}
