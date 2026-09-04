import { NextRequest, NextResponse } from "next/server";
import { BackendApiError, backendFetch } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { CustomerPortalAccessStatus } from "@/types/customerPortal";

function fail(error: unknown) {
  return NextResponse.json(
    { success: false, message: error instanceof BackendApiError ? error.message : "Customer portal access request failed." },
    { status: error instanceof BackendApiError ? error.statusCode : 502 },
  );
}

async function projectId(params: Promise<{ projectId: string }>) {
  return (await params).projectId;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;
  try {
    const data = await backendFetch<CustomerPortalAccessStatus>(
      `/customer-portal/access/project/${encodeURIComponent(await projectId(params))}`,
      { accessToken: token },
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;
  try {
    const data = await backendFetch<CustomerPortalAccessStatus>(
      `/customer-portal/access/project/${encodeURIComponent(await projectId(params))}`,
      { method: "POST", accessToken: token },
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const token = requireAccessToken(req);
  if (token instanceof NextResponse) return token;
  try {
    const data = await backendFetch<{ enabled: boolean }>(
      `/customer-portal/access/project/${encodeURIComponent(await projectId(params))}`,
      { method: "DELETE", accessToken: token },
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return fail(error);
  }
}
