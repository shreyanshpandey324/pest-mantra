import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
import { ExpenseClaim } from "@/types/expense";
function fail(e: unknown, fallback: string) { return NextResponse.json({ success:false, message:e instanceof BackendApiError ? e.message : fallback }, { status:e instanceof BackendApiError ? e.statusCode : 502 }); }
export async function GET(req: NextRequest) { const token=requireAccessToken(req); if(token instanceof NextResponse)return token; try { const data=await backendFetch<{expenses:ExpenseClaim[]}>("/expenses/claims/me",{accessToken:token}); return NextResponse.json({success:true,data}); } catch(e){return fail(e,"Could not load expense claims");} }
export async function POST(req: NextRequest) { const token=requireAccessToken(req); if(token instanceof NextResponse)return token; try { const data=await backendFetch<{expense:ExpenseClaim}>("/expenses/claims",{method:"POST",body:await req.json(),accessToken:token}); return NextResponse.json({success:true,data},{status:201}); } catch(e){return fail(e,"Could not submit expense claim");} }
