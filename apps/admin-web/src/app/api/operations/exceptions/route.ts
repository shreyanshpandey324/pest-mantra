import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";

export async function GET(req: NextRequest) {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;
  try {
    const data = await backendFetch("/operations/exceptions", { accessToken: token });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof BackendApiError ? error.message : "Could not load exception inbox" }, { status: error instanceof BackendApiError ? error.statusCode : 502 });
  }
}
