import { NextResponse } from "next/server";
import { CUSTOMER_PORTAL_COOKIE_NAME } from "@/lib/customer-portal-session";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Signed out" });
  response.cookies.delete(CUSTOMER_PORTAL_COOKIE_NAME);
  return response;
}
