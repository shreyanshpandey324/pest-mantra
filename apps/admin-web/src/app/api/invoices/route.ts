import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { Invoice } from "@/types/invoice";
function fail(e: unknown, message: string) { return NextResponse.json({ success: false, message: e instanceof BackendApiError ? e.message : message, details: e instanceof BackendApiError ? e.details : undefined }, { status: e instanceof BackendApiError ? e.statusCode : 502 }); }
export async function GET(req: NextRequest) { const t = requireAccessToken(req); if (t instanceof NextResponse) return t; try { const qs = req.nextUrl.searchParams.toString(); const data = await backendFetch<{ invoices: Invoice[] }>(`/invoices${qs ? `?${qs}` : ""}`, { accessToken: t }); return NextResponse.json({ success: true, data }); } catch (e) { return fail(e, "Failed to load invoices"); } }
export async function POST(req: NextRequest) { const t = requireAccessToken(req); if (t instanceof NextResponse) return t; try { const data = await backendFetch<{ invoice: Invoice }>("/invoices", { method: "POST", body: await req.json(), accessToken: t }); return NextResponse.json({ success: true, data }, { status: 201 }); } catch (e) { return fail(e, "Failed to create invoice"); } }
