import { NextRequest, NextResponse } from "next/server";
import { BackendApiError, backendFetch } from "@/lib/backend-client";
import { FeedbackPublicInfo } from "@/types/feedback";

function fail(error: unknown) {
  return NextResponse.json(
    {
      success: false,
      message: error instanceof BackendApiError ? error.message : "Feedback request failed.",
      details: error instanceof BackendApiError ? error.details : undefined,
    },
    { status: error instanceof BackendApiError ? error.statusCode : 502 }
  );
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const data = await backendFetch<FeedbackPublicInfo>(`/feedback/public/${encodeURIComponent(code)}`);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const data = await backendFetch<{ submitted: boolean; rating: number; submittedAt: string }>(
      `/feedback/public/${encodeURIComponent(code)}`,
      { method: "POST", body: await request.json() }
    );
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
