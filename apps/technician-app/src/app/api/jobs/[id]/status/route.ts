import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { Job } from "@/types/job";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  try {
    // The backend applies the same project-visibility check before
    // allowing this write — a technician can only move their own
    // assigned job through the status state machine, and only
    // along the transitions ALLOWED_STATUS_TRANSITIONS permits
    // (see Module 2's project.validators.ts).
    const data = await backendFetch<{ project: Job }>(`/projects/${id}/status`, {
      method: "PATCH",
      body,
      accessToken: token,
    });
    return NextResponse.json({ success: true, message: "Status updated", data: { job: data.project } });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof BackendApiError ? err.message : "Failed to update status" },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}
