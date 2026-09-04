import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
export async function GET(req:NextRequest){const token=requireAccessToken(req);if(token instanceof NextResponse)return token;try{return NextResponse.json({success:true,data:await backendFetch("/operations/end-of-day",{accessToken:token})});}catch(e){return NextResponse.json({success:false,message:e instanceof BackendApiError?e.message:"Could not load summary"},{status:e instanceof BackendApiError?e.statusCode:502});}}
