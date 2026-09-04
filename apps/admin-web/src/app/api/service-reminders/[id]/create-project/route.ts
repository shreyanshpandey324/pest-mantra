import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) { const token=requireAccessToken(req); if(token instanceof NextResponse)return token; try{const {id}=await params;const data=await backendFetch(`/service-reminders/${encodeURIComponent(id)}/create-project`,{method:"POST",accessToken:token});return NextResponse.json({success:true,data},{status:201});}catch(error){return NextResponse.json({success:false,message:error instanceof BackendApiError?error.message:"Could not create follow-up job"},{status:error instanceof BackendApiError?error.statusCode:502});}}
