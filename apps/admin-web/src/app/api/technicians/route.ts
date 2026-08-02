import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { TechnicianListItem } from "@/types/project";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;

  try {
    const data = await backendFetch<{ technicians: TechnicianListItem[] }>("/technicians", {
      accessToken: token,
    });
    return NextResponse.json({ success: true, message: "OK", data });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof BackendApiError ? err.message : "Failed to load technicians",
      },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}
