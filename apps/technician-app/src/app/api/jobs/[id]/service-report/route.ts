import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";

function errorResponse(error: unknown) {
  return NextResponse.json(
    { success: false, message: error instanceof BackendApiError ? error.message : "Service report request failed" },
    { status: error instanceof BackendApiError ? error.statusCode : 502 }
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;
  const { id } = await params;
  try {
    const data = await backendFetch(`/service-reports/project/${id}`, { accessToken: token });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  try {
    const data = await backendFetch(`/service-reports/project/${id}`, {
      method: "PUT",
      body,
      accessToken: token,
    });
    return NextResponse.json({ success: true, message: "Service report saved", data });
  } catch (error) {
    return errorResponse(error);
  }
}
