import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let phone: unknown;
  try {
    phone = (await req.json()).phone;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  if (typeof phone !== "string" || !phone) {
    return NextResponse.json({ success: false, message: "Phone number is required" }, { status: 400 });
  }

  try {
    await backendFetch("/auth/otp/eligibility", {
      method: "POST",
      body: { phone, audience: "admin" },
    });

    return NextResponse.json({
      success: true,
      message: "Phone number is approved for OTP login",
      data: { eligible: true },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof BackendApiError ? err.message : "Unable to check OTP access.",
      },
      { status: err instanceof BackendApiError ? err.statusCode : 502 }
    );
  }
}
