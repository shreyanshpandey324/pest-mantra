import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;
  try {
    const { id } = await params;
    const data = await backendFetch<{ technician: unknown }>(`/technicians/${encodeURIComponent(id)}`, { accessToken: token });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof BackendApiError ? err.message : "Could not load technician" },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}
