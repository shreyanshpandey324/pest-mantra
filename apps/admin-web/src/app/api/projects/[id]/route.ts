import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // ✅ Next.js 15 requires awaiting params
  const { id } = await params;

  const token = requireAccessToken(req);

  if (token instanceof NextResponse) {
    return token;
  }

  try {
    await backendFetch(`/projects/${id}`, {
      method: "DELETE",
      accessToken: token,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Project deleted successfully",
      },
      {
        status: 200,
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof BackendApiError
            ? err.message
            : "Failed to delete project",
      },
      {
        status:
          err instanceof BackendApiError
            ? err.statusCode
            : 500,
      }
    );
  }
}