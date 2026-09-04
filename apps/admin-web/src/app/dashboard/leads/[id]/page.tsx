import Link from "next/link";
import { cookies } from "next/headers";
import LeadDetailClient from "@/components/LeadDetailClient";
import { BackendApiError, backendFetch } from "@/lib/backend-client";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { ui } from "@/lib/ui-classes";
import { Lead } from "@/types/lead";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await cookies()).get(ACCESS_COOKIE_NAME)?.value;
  let lead: Lead | null = null;
  let error = "";
  try { lead = (await backendFetch<{ lead: Lead }>(`/leads/${id}`, { accessToken: token })).lead; }
  catch (e) { error = e instanceof BackendApiError ? e.message : "Could not load lead"; }
  if (!lead) return <div className="space-y-5"><Link href="/dashboard/leads" className={ui.btnGhost}>← Back to leads</Link><div className="rounded-xl border border-danger/30 bg-danger/10 p-5 text-danger">{error || "Lead not found"}</div></div>;
  return <div className="space-y-6"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-accent">Sales opportunity</p><h1 className="mt-1 text-3xl font-semibold">{lead.customerName}</h1><p className="mt-2 text-sm text-ink-muted">{lead.leadNumber} · Managed sales history and next actions.</p></div><Link href="/dashboard/leads" className={ui.btnGhost}>Back</Link></div><LeadDetailClient initialLead={lead} /></div>;
}
