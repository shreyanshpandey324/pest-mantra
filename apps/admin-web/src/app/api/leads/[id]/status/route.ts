import { NextRequest, NextResponse } from "next/server";
import { BackendApiError, backendFetch } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { Lead } from "@/types/lead";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = requireAccessToken(req); if (token instanceof NextResponse) return token;
  try { const { id } = await params; const data = await backendFetch<{ lead: Lead }>(`/leads/${id}/status`, { method: "PATCH", accessToken: token, body: await req.json() }); return NextResponse.json({ success: true, data }); }
  catch (error) { return NextResponse.json({ success: false, message: error instanceof BackendApiError ? error.message : "Could not update lead status" }, { status: error instanceof BackendApiError ? error.statusCode : 502 }); }
}
