import { NextRequest, NextResponse } from "next/server";
import {
  backendFetch,
  BackendApiError,
} from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const token = requireAccessToken(req);

  if (token instanceof NextResponse) {
    return token;
  }

  const { id } = await context.params;

  try {
    const data = await backendFetch<{
      company: unknown;
    }>(`/companies/${id}/approve`, {
      method: "POST",
      accessToken: token,
    });

    return NextResponse.json({
      success: true,
      message: "Company approved",
      data,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof BackendApiError
            ? err.message
            : "Could not approve company",
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