import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { Job } from "@/types/job";

/**
 * No technician-specific filtering happens here — none is needed.
 * The backend's GET /projects already derives the caller's
 * identity from the verified JWT and hard-scopes the result set to
 * their own assigned jobs when the role is technician (see Module 2's
 * project.service.ts, listProjects()). This route is a thin,
 * unmodified proxy; the isolation guarantee lives entirely in the
 * one place it's always lived.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;

  const status = req.nextUrl.searchParams.get("status");
  const query = status ? `?status=${encodeURIComponent(status)}` : "";

  try {
    const data = await backendFetch<{ projects: Job[] }>(`/projects${query}`, { accessToken: token });
    return NextResponse.json({ success: true, message: "OK", data: { jobs: data.projects } });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof BackendApiError ? err.message : "Failed to load jobs" },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}
