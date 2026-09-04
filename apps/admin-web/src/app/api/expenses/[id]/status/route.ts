import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { Expense } from "@/types/expense";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = requireAccessToken(req); if (token instanceof NextResponse) return token;
  const id = (await params).id;
  try { const data = await backendFetch<{ expense: Expense }>(`/expenses/${id}/status`, { method: "PATCH", body: await req.json(), accessToken: token }); return NextResponse.json({ success: true, data }); }
  catch (e) { return NextResponse.json({ success: false, message: e instanceof BackendApiError ? e.message : "Failed to update expense status", details: e instanceof BackendApiError ? e.details : undefined }, { status: e instanceof BackendApiError ? e.statusCode : 502 }); }
}
