import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { ChemicalCheckout } from "@/types/inventory";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  try {
    const data = await backendFetch<{ checkout: ChemicalCheckout }>("/chemicals/checkout", {
      method: "POST",
      body,
      accessToken: token,
    });
    return NextResponse.json({ success: true, message: "Chemical checked out", data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof BackendApiError ? err.message : "Failed to check out chemical",
      },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}
