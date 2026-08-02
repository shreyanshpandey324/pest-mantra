import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { ProjectStatusHistoryEntry } from "@/types/project";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;

  const { id } = await params;

  try {
    const data = await backendFetch<{ history: ProjectStatusHistoryEntry[] }>(
      `/projects/${id}/history`,
      { accessToken: token }
    );
    return NextResponse.json({ success: true, message: "OK", data });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof BackendApiError ? err.message : "Failed to load history" },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}
