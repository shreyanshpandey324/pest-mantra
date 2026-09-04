import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { requireAccessToken } from "@/lib/require-token";
async function idOf(p:Promise<{id:string}>){return(await p).id;}
function fail(e:unknown){return NextResponse.json({success:false,message:e instanceof BackendApiError?e.message:"Expense claim request failed"},{status:e instanceof BackendApiError?e.statusCode:502});}
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){const token=requireAccessToken(req);if(token instanceof NextResponse)return token;try{return NextResponse.json({success:true,data:await backendFetch(`/expenses/claims/${await idOf(params)}`,{method:"PATCH",body:await req.json(),accessToken:token})});}catch(e){return fail(e);}}
export async function DELETE(req:NextRequest,{params}:{params:Promise<{id:string}>}){const token=requireAccessToken(req);if(token instanceof NextResponse)return token;try{await backendFetch(`/expenses/claims/${await idOf(params)}`,{method:"DELETE",accessToken:token});return NextResponse.json({success:true});}catch(e){return fail(e);}}
