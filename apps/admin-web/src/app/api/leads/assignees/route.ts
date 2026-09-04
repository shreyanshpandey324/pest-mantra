import { NextRequest, NextResponse } from "next/server";
import { BackendApiError, backendFetch } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { LeadAssignee } from "@/types/lead";
export async function GET(req: NextRequest) {
  const token = requireAccessToken(req); if (token instanceof NextResponse) return token;
  try { const query = req.nextUrl.searchParams.toString(); const data = await backendFetch<{ assignees: LeadAssignee[] }>(`/leads/assignees${query ? `?${query}` : ""}`, { accessToken: token }); return NextResponse.json({ success: true, data }); }
  catch (error) { return NextResponse.json({ success: false, message: error instanceof BackendApiError ? error.message : "Could not load assignees" }, { status: error instanceof BackendApiError ? error.statusCode : 502 }); }
}
