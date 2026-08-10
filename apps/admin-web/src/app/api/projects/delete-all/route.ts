import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";

export async function DELETE(req: NextRequest) {
  const token = requireAccessToken(req);

  if (token instanceof NextResponse) {
    return token;
  }

  try {
    await backendFetch("/projects/delete-all", {
      method: "DELETE",
      accessToken: token,
    });

    return NextResponse.json({
      success: true,
      message: "All projects deleted successfully",
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof BackendApiError
            ? err.message
            : "Unable to delete projects",
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