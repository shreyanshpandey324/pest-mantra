import { NextRequest, NextResponse } from "next/server";
import {
  backendFetch,
  BackendApiError,
} from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { AuthUser } from "@/types/auth";

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

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid request body",
      },
      { status: 400 }
    );
  }

  try {
    const data = await backendFetch<{
      user: AuthUser;
    }>(`/users/${id}`, {
      method: "PATCH",
      body,
      accessToken: token,
    });

    return NextResponse.json({
      success: true,
      data,
      message: "User updated successfully",
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof BackendApiError
            ? err.message
            : "Unable to update user.",
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

export async function DELETE(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const token = requireAccessToken(req);

  if (token instanceof NextResponse) {
    return token;
  }

  const { id } = await context.params;

  try {
    await backendFetch(`/users/${id}`, {
      method: "DELETE",
      accessToken: token,
    });

    return NextResponse.json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof BackendApiError
            ? err.message
            : "Unable to deactivate user.",
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
