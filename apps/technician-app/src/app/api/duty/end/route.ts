import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;

  try {
    const data = await backendFetch("/technicians/duty/end", { method: "POST", accessToken: token });
    return NextResponse.json({ success: true, message: "Duty ended", data });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof BackendApiError ? err.message : "Could not end duty" },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}
