import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { AuthUser, UserRole } from "@/types/auth";

interface CreateUserBody {
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: UserRole;
  branchId?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;

  let body: CreateUserBody;

  try {
    body = (await req.json()) as CreateUserBody;
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
    const data = await backendFetch<{ user: AuthUser }>("/users", {
      method: "POST",
      body,
      accessToken: token,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Technician created successfully",
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
            : "Unable to create technician.",
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