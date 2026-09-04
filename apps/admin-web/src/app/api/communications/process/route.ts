import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
export async function POST(req: NextRequest) { const token=requireAccessToken(req); if(token instanceof NextResponse)return token; try{const data=await backendFetch("/communications/process",{method:"POST",accessToken:token});return NextResponse.json({success:true,data});}catch(err){return NextResponse.json({success:false,message:err instanceof BackendApiError?err.message:"Could not process outbox"},{status:err instanceof BackendApiError?err.statusCode:502});}}
