import { NextRequest, NextResponse } from "next/server";

import {
  backendFetch,
  BackendApiError,
} from "@/lib/backend-client";

import {
  requireAccessToken,
} from "@/lib/require-token";

export async function GET(
  req: NextRequest
): Promise<NextResponse> {
  const token = requireAccessToken(req);

  if (token instanceof NextResponse) {
    return token;
  }

  try {
    const data = await backendFetch<{
      settings: unknown;
    }>("/settings", {
      method: "GET",
      accessToken: token,
    });

    return NextResponse.json({
      success: true,
      data,
      message: "Settings loaded successfully",
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof BackendApiError
            ? err.message
            : "Unable to load settings.",
        details:
          err instanceof BackendApiError
            ? err.details
            : undefined,
      },
      {
        status:
          err instanceof BackendApiError
            ? err.statusCode
            : 502,
      }
    );
  }
}