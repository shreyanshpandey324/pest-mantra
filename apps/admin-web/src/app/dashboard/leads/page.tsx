import { cookies } from "next/headers";
import { LeadPipelineClient } from "@/components/LeadPipelineClient";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { BackendApiError, backendFetch } from "@/lib/backend-client";
import { LeadListResponse } from "@/types/lead";

const empty: LeadListResponse = {
  leads: [],
  metrics: { total: 0, open: 0, qualified: 0, won: 0, lost: 0, overdueFollowUps: 0, dueToday: 0, hot: 0, conversionRate: 0, sourceBreakdown: [] },
  pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0, hasPreviousPage: false, hasNextPage: false },
};

export default async function LeadsPage() {
  const token = (await cookies()).get(ACCESS_COOKIE_NAME)?.value;
  let data = empty;
  let error = "";
  try { data = await backendFetch<LeadListResponse>("/leads?page=1&pageSize=100&sort=updated_desc", { accessToken: token }); }
  catch (e) { error = e instanceof BackendApiError ? e.message : "Could not load the sales pipeline"; }
  return <div className="space-y-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-accent">Sales CRM</p><h1 className="mt-1 text-3xl font-semibold">Lead Pipeline</h1><p className="mt-2 text-sm text-ink-muted">Track every enquiry from first contact to quotation and won business.</p></div></div>{error ? <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}<LeadPipelineClient initialData={data} /></div>;
}
