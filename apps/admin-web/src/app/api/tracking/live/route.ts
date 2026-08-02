import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { LocationLogEntry } from "@/types/tracking";

/**
 * ⚠️ Proxies to `${BACKEND_API_URL}/location/live`, a path taken
 * directly from MODULE_3_TECHNICIAN_TRACKING.md and never verified
 * against real backend source. If your backend uses a different
 * path or a different response shape than `{ locations: LocationLogEntry[] }`,
 * this is the one place to fix it.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;

  try {
    const data = await backendFetch<{ locations: LocationLogEntry[] }>("/location/live", {
      accessToken: token,
    });
    return NextResponse.json({ success: true, message: "OK", data });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof BackendApiError
            ? err.message
            : "Could not reach /location/live — verify this endpoint exists on your backend.",
      },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}
