import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  backendFetch,
  BackendApiError,
} from "@/lib/backend-client";

import {
  requireAccessToken,
} from "@/lib/require-token";

interface LocationUpdateBody {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  batteryLevel?: number;
  isCharging?: boolean;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse> {
  const token = requireAccessToken(req);

  if (token instanceof NextResponse) {
    return token;
  }

  try {
    const body =
      (await req.json()) as LocationUpdateBody;

    const data = await backendFetch(
      "/location/update",
      {
        method: "POST",
        accessToken: token,
        body,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Location updated",
      data,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof BackendApiError
            ? err.message
            : "Could not update location",
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