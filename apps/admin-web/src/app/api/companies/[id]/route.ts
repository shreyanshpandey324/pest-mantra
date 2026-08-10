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

export async function PATCH(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const token = requireAccessToken(req);

  if (token instanceof NextResponse) {
    return token;
  }

  const { id } = await context.params;

  try {
    const body = await req.json();

    const data = await backendFetch<{
      company: unknown;
    }>(`/companies/${id}`, {
      method: "PATCH",
      accessToken: token,
      body,
    });

    return NextResponse.json({
      success: true,
      message: "Company updated",
      data,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof BackendApiError
            ? err.message
            : "Could not update company",
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