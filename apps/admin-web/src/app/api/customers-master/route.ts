import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
function fail(e: unknown, m: string) { return NextResponse.json({ success: false, message: e instanceof BackendApiError ? e.message : m }, { status: e instanceof BackendApiError ? e.statusCode : 502 }); }
export async function GET(req: NextRequest) { const t=requireAccessToken(req); if(t instanceof NextResponse)return t; try{const qs=req.nextUrl.searchParams.toString();const data=await backendFetch(`/customers-master${qs?`?${qs}`:""}`,{accessToken:t});return NextResponse.json({success:true,data});}catch(e){return fail(e,"Failed to load customer master");}}
export async function POST(req: NextRequest) { const t=requireAccessToken(req); if(t instanceof NextResponse)return t; try{const data=await backendFetch("/customers-master",{method:"POST",body:await req.json(),accessToken:t});return NextResponse.json({success:true,data},{status:201});}catch(e){return fail(e,"Failed to create customer");}}
