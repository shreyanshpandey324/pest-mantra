import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_URL, backendRequestSignal } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";

async function idOf(params: Promise<{ id: string }>) {
  return encodeURIComponent((await params).id);
}

function backendUnavailable(error: unknown) {
  const timedOut =
    error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
  return NextResponse.json(
    {
      success: false,
      message: timedOut
        ? "The server took too long to handle the receipt. Please retry."
        : "Unable to reach the server. Please try again.",
    },
    { status: timedOut ? 504 : 502 },
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid receipt upload" }, { status: 400 });
  }

  try {
    const response = await fetch(`${BACKEND_API_URL}/expenses/${await idOf(params)}/receipt`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      cache: "no-store",
      signal: backendRequestSignal(45_000),
    });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch (error) {
    return backendUnavailable(error);
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;

  try {
    const response = await fetch(`${BACKEND_API_URL}/expenses/${await idOf(params)}/receipt`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: backendRequestSignal(30_000),
    });
    if (!response.ok) {
      return new NextResponse(await response.text(), {
        status: response.status,
        headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
      });
    }
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return backendUnavailable(error);
  }
}
