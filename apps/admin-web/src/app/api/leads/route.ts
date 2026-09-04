import { NextRequest, NextResponse } from "next/server";
import { BackendApiError, backendFetch } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { Lead, LeadListResponse } from "@/types/lead";

function failure(error: unknown, fallback: string) {
  return NextResponse.json(
    { success: false, message: error instanceof BackendApiError ? error.message : fallback, details: error instanceof BackendApiError ? error.details : undefined },
    { status: error instanceof BackendApiError ? error.statusCode : 502 },
  );
}

export async function GET(req: NextRequest) {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;
  try {
    const query = req.nextUrl.searchParams.toString();
    const data = await backendFetch<LeadListResponse>(`/leads${query ? `?${query}` : ""}`, { accessToken: token });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return failure(error, "Could not load leads");
  }
}

export async function POST(req: NextRequest) {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;
  try {
    const data = await backendFetch<{ lead: Lead }>("/leads", { method: "POST", accessToken: token, body: await req.json() });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return failure(error, "Could not create lead");
  }
}
