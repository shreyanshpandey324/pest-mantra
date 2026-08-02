import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { Chemical } from "@/types/inventory";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;

  try {
    const data = await backendFetch<{ chemicals: Chemical[] }>("/chemicals", { accessToken: token });
    return NextResponse.json({ success: true, message: "OK", data });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof BackendApiError ? err.message : "Failed to load chemicals" },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}

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
    const data = await backendFetch<{ chemical: Chemical }>("/chemicals", {
      method: "POST",
      body,
      accessToken: token,
    });
    return NextResponse.json({ success: true, message: "Chemical created", data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof BackendApiError ? err.message : "Failed to create chemical" },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}
