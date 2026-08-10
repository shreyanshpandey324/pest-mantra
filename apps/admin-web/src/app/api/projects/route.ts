import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { Project } from "@/types/project";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = requireAccessToken(req);

  if (token instanceof NextResponse) {
    return token;
  }

  const status = req.nextUrl.searchParams.get("status");
  const query = status
    ? `?status=${encodeURIComponent(status)}`
    : "";

  try {
    const data = await backendFetch<{ projects: Project[] }>(
      `/projects${query}`,
      {
        accessToken: token,
      }
    );

    return NextResponse.json({
      success: true,
      message: "OK",
      data,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof BackendApiError
            ? err.message
            : "Failed to load projects",
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = requireAccessToken(req);

  if (token instanceof NextResponse) {
    return token;
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid request body",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const data = await backendFetch<{ project: Project }>(
      "/projects",
      {
        method: "POST",
        body,
        accessToken: token,
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: "Project created successfully",
        data,
      },
      {
        status: 201,
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof BackendApiError
            ? err.message
            : "Failed to create project",
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