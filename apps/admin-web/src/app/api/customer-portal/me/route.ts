import { NextRequest, NextResponse } from "next/server";
import { BackendApiError, backendFetch } from "@/lib/backend-client";
import { CUSTOMER_PORTAL_COOKIE_NAME } from "@/lib/customer-portal-session";
import { CustomerPortalDashboardData } from "@/types/customerPortal";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(CUSTOMER_PORTAL_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ success: false, message: "Customer portal session required" }, { status: 401 });

  try {
    const data = await backendFetch<CustomerPortalDashboardData>("/customer-portal/me", { accessToken: token });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof BackendApiError ? error.message : "Could not load your customer portal." },
      { status: error instanceof BackendApiError ? error.statusCode : 502 },
    );
  }
}
