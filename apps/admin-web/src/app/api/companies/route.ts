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
    const data = await backendFetch<{
      companies: unknown[];
    }>("/companies", {
      accessToken: token,
    });

    return NextResponse.json({
      success: true,
      message: "Companies",
      data,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof BackendApiError
            ? err.message
            : "Could not load companies",
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
      company: unknown;
    }>("/companies", {
      method: "POST",
      accessToken: token,
      body,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Company created",
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
            : "Could not create company",
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