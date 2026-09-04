import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { LocationLogEntry } from "@/types/tracking";

/** Proxies the verified backend GET /location/live endpoint. */
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
            : "Could not load live technician locations.",
      },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}
