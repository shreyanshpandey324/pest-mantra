import { NextRequest, NextResponse } from "next/server";
import { BackendApiError, backendFetch } from "@/lib/backend-client";
import { CUSTOMER_PORTAL_COOKIE_NAME } from "@/lib/customer-portal-session";
export async function POST(req: NextRequest) {
  const token=req.cookies.get(CUSTOMER_PORTAL_COOKIE_NAME)?.value;
  if(!token)return NextResponse.json({success:false,message:"Customer portal session required"},{status:401});
  try{const data=await backendFetch("/customer-portal/complaints",{method:"POST",body:await req.json(),accessToken:token});return NextResponse.json({success:true,data},{status:201});}
  catch(error){return NextResponse.json({success:false,message:error instanceof BackendApiError?error.message:"Could not register complaint"},{status:error instanceof BackendApiError?error.statusCode:502});}
}
