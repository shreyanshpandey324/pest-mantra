import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = requireAccessToken(req); if (token instanceof NextResponse) return token;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ success:false, message:"Invalid request body" }, { status:400 });
  try { const data = await backendFetch(`/projects/${id}/reassign`, { method:"PATCH", body, accessToken:token }); return NextResponse.json({ success:true, data }); }
  catch (error) { return NextResponse.json({ success:false, message:error instanceof BackendApiError?error.message:"Could not hand over job" }, { status:error instanceof BackendApiError?error.statusCode:502 }); }
}
