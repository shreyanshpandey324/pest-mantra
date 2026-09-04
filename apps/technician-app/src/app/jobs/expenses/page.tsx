import Link from "next/link";
import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { Job } from "@/types/job";
import { ExpenseClaim } from "@/types/expense";
import { ExpenseClaimsClient } from "@/components/ExpenseClaimsClient";

export default async function ExpenseClaimsPage(){const token=(await cookies()).get(ACCESS_COOKIE_NAME)?.value;let claims:ExpenseClaim[]=[];let jobs:Job[]=[];let error="";try{const [c,j]=await Promise.all([backendFetch<{expenses:ExpenseClaim[]}>("/expenses/claims/me",{accessToken:token}),backendFetch<{projects:Job[]}>("/projects",{accessToken:token})]);claims=c.expenses;jobs=j.projects;}catch(e){error=e instanceof BackendApiError?e.message:"Could not load expense claims";}return <div className="space-y-5"><div><Link href="/jobs" className="text-xs text-ink-muted">← Back to jobs</Link><p className="mt-4 font-mono text-[11px] uppercase tracking-[.18em] text-accent">Field expenses</p><h1 className="mt-1 text-xl font-semibold">Expense Claims</h1><p className="mt-1 text-sm text-ink-muted">Submit fuel, travel and field costs with receipts for office approval.</p></div>{error?<div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div>:null}<ExpenseClaimsClient initialClaims={claims} jobs={jobs}/></div>}
