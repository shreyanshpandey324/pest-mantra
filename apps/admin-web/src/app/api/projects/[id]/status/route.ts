import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { Project } from "@/types/project";

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
    const data = await backendFetch<{ project: Project }>(`/projects/${id}/status`, {
      method: "PATCH",
      body,
      accessToken: token,
    });

    return NextResponse.json({ success: true, message: "Project status updated", data });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof BackendApiError ? err.message : "Failed to update project status",
        details: err instanceof BackendApiError ? err.details : undefined,
      },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}
