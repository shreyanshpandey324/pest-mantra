import { NextRequest, NextResponse } from "next/server";

import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import type { Job } from "@/types/job";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;

  const { id } = await params;
  try {
    const data = await backendFetch<{ project: Job }>(`/projects/${id}/acknowledge-assignment`, {
      method: "PATCH",
      accessToken: token,
    });
    return NextResponse.json({ success: true, message: "Assignment acknowledged", data: { job: data.project } });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof BackendApiError ? err.message : "Could not acknowledge assignment" },
      { status: err instanceof BackendApiError ? err.statusCode : 502 },
    );
  }
}
