import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "pest-mantra-technician",
    timestamp: new Date().toISOString(),
  });
}
