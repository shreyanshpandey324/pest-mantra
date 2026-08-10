import { NextRequest, NextResponse } from "next/server";
import {
  backendFetch,
  BackendApiError,
} from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";

export async function GET(
  req: NextRequest
): Promise<NextResponse> {
  const token = requireAccessToken(req);

  if (token instanceof NextResponse) {
    return token;
  }

  try {
    const companyId =
      req.nextUrl.searchParams.get(
        "companyId"
      );

    const path = companyId
      ? `/companies/branches?companyId=${encodeURIComponent(
          companyId
        )}`
      : "/companies/branches";

    const data = await backendFetch<{
      branches: unknown[];
    }>(path, {
      accessToken: token,
    });

    return NextResponse.json({
      success: true,
      message: "Branches",
      data,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof BackendApiError
            ? err.message
            : "Could not load branches",
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

export async function POST(
  req: NextRequest
): Promise<NextResponse> {
  const token = requireAccessToken(req);

  if (token instanceof NextResponse) {
    return token;
  }

  try {
    const body = await req.json();

    const data = await backendFetch<{
      branch: unknown;
    }>("/companies/branches", {
      method: "POST",
      accessToken: token,
      body,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Branch created",
        data,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof BackendApiError
            ? err.message
            : "Could not create branch",
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