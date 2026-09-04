import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_URL, backendRequestSignal } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
): Promise<NextResponse> {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;

  const { id, photoId } = await params;

  try {
    const backendRes = await fetch(
      `${BACKEND_API_URL}/projects/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: backendRequestSignal(30_000),
      }
    );

    if (!backendRes.ok) {
      return new NextResponse(null, { status: backendRes.status });
    }

    const headers = new Headers();
    const contentType = backendRes.headers.get("content-type");
    const contentLength = backendRes.headers.get("content-length");
    const cacheControl = backendRes.headers.get("cache-control");

    if (contentType) headers.set("content-type", contentType);
    if (contentLength) headers.set("content-length", contentLength);
    if (cacheControl) headers.set("cache-control", cacheControl);

    return new NextResponse(backendRes.body, {
      status: 200,
      headers,
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
