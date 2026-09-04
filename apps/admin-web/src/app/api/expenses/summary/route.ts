import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { FinanceSummary } from "@/types/expense";
export async function GET(req: NextRequest) {
  const token = requireAccessToken(req); if (token instanceof NextResponse) return token;
  try { const qs = req.nextUrl.searchParams.toString(); const data = await backendFetch<{ summary: FinanceSummary }>(`/expenses/summary${qs ? `?${qs}` : ""}`, { accessToken: token }); return NextResponse.json({ success: true, data }); }
  catch (e) { return NextResponse.json({ success: false, message: e instanceof BackendApiError ? e.message : "Failed to load finance summary" }, { status: e instanceof BackendApiError ? e.statusCode : 502 }); }
}
