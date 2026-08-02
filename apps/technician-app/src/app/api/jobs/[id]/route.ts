import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { Job, JobPhoto } from "@/types/job";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;

  const { id } = await params;

  try {
    // The backend's getProjectById applies the same visibility
    // check as the list endpoint — a technician requesting a job
    // that isn't theirs gets a 404 here, not this job's data.
    const [projectData, photosData] = await Promise.all([
      backendFetch<{ project: Job }>(`/projects/${id}`, { accessToken: token }),
      backendFetch<{ photos: JobPhoto[] }>(`/projects/${id}/photos`, { accessToken: token }),
    ]);
    return NextResponse.json({
      success: true,
      message: "OK",
      data: { job: projectData.project, photos: photosData.photos },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof BackendApiError ? err.message : "Failed to load job" },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}
