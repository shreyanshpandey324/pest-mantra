import { NextRequest, NextResponse } from "next/server";
import { BackendApiError, backendFetch } from "@/lib/backend-client";
import { customerPortalCookieOptions } from "@/lib/customer-portal-session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await backendFetch<{
      token: string;
      expiresInSeconds: number;
      customer: { name: string; phone: string };
    }>("/customer-portal/login", { method: "POST", body });

    const response = NextResponse.json({
      success: true,
      message: "Signed in",
      data: { customer: data.customer },
    });
    response.cookies.set({
      ...customerPortalCookieOptions(data.expiresInSeconds),
      value: data.token,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof BackendApiError ? error.message : "Could not sign in to the customer portal.",
      },
      { status: error instanceof BackendApiError ? error.statusCode : 502 },
    );
  }
}
