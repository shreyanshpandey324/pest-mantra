import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { ProjectChemicalUsage } from "@/types/inventory";

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
    const data = await backendFetch<{ usage: ProjectChemicalUsage }>("/chemicals/usage", {
      method: "POST",
      body,
      accessToken: token,
    });
    return NextResponse.json({ success: true, message: "Chemical usage logged", data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof BackendApiError ? err.message : "Could not log chemical usage." },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}
