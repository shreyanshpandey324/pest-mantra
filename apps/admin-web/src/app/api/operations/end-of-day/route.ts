import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
export async function GET(req: NextRequest) {
  const token = requireAccessToken(req); if (token instanceof NextResponse) return token;
  try { return NextResponse.json({ success: true, data: await backendFetch("/operations/end-of-day", { accessToken: token }) }); }
  catch (error) { return NextResponse.json({ success:false, message:error instanceof BackendApiError?error.message:"Could not load summary" }, { status:error instanceof BackendApiError?error.statusCode:502 }); }
}
