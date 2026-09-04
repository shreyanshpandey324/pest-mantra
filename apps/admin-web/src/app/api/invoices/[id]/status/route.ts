import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { Invoice } from "@/types/invoice";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) { const t = requireAccessToken(req); if (t instanceof NextResponse) return t; try { const { id } = await params; return NextResponse.json({ success: true, data: await backendFetch<{ invoice: Invoice }>(`/invoices/${id}/status`, { method: "PATCH", body: await req.json(), accessToken: t }) }); } catch (e) { return NextResponse.json({ success: false, message: e instanceof BackendApiError ? e.message : "Could not update invoice" }, { status: e instanceof BackendApiError ? e.statusCode : 502 }); } }
