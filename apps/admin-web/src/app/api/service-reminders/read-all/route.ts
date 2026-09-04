import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
export async function PATCH(req: NextRequest) { const token=requireAccessToken(req); if(token instanceof NextResponse)return token; try{const data=await backendFetch("/service-reminders/read-all",{method:"PATCH",accessToken:token});return NextResponse.json({success:true,data});}catch(error){return NextResponse.json({success:false,message:error instanceof BackendApiError?error.message:"Could not update reminders"},{status:error instanceof BackendApiError?error.statusCode:502});}}
