import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { Expense } from "@/types/expense";

function fail(e: unknown, message: string) {
  return NextResponse.json(
    { success: false, message: e instanceof BackendApiError ? e.message : message, details: e instanceof BackendApiError ? e.details : undefined },
    { status: e instanceof BackendApiError ? e.statusCode : 502 }
  );
}

export async function GET(req: NextRequest) {
  const token = requireAccessToken(req); if (token instanceof NextResponse) return token;
  try {
    const qs = req.nextUrl.searchParams.toString();
    const data = await backendFetch<{ expenses: Expense[] }>(`/expenses${qs ? `?${qs}` : ""}`, { accessToken: token });
    return NextResponse.json({ success: true, data });
  } catch (e) { return fail(e, "Failed to load expenses"); }
}

export async function POST(req: NextRequest) {
  const token = requireAccessToken(req); if (token instanceof NextResponse) return token;
  try {
    const data = await backendFetch<{ expense: Expense }>("/expenses", { method: "POST", body: await req.json(), accessToken: token });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (e) { return fail(e, "Failed to create expense"); }
}
