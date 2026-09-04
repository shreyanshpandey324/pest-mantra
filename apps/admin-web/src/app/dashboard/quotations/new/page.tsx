import Link from "next/link";
import { cookies } from "next/headers";
import QuotationForm, { QuotationPrefill } from "@/components/QuotationForm";
import { backendFetch } from "@/lib/backend-client";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { ui } from "@/lib/ui-classes";
import { Lead } from "@/types/lead";

export default async function Page({ searchParams }: { searchParams: Promise<{ leadId?: string }> }) {
  const { leadId } = await searchParams;
  let prefill: QuotationPrefill | undefined;
  if (leadId) {
    try {
      const token = (await cookies()).get(ACCESS_COOKIE_NAME)?.value;
      const lead = (await backendFetch<{ lead: Lead }>(`/leads/${encodeURIComponent(leadId)}`, { accessToken: token })).lead;
      prefill = {
        leadId: lead._id,
        companyId: lead.companyId,
        branchId: lead.branchId,
        customerName: lead.customerName,
        customerPhone: lead.customerPhone,
        customerEmail: lead.customerEmail,
        address: lead.address,
        city: lead.city,
        serviceType: lead.serviceType,
        treatmentDescription: lead.notes,
      };
    } catch { prefill = undefined; }
  }
  return <div className="space-y-6"><div className="flex items-start justify-between"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-accent">Sales workspace</p><h1 className="mt-1 text-3xl font-semibold">Create quotation</h1><p className="mt-2 text-sm text-ink-muted">A polished proposal ready to send to your customer.</p></div><Link href={leadId ? `/dashboard/leads/${leadId}` : "/dashboard/quotations"} className={ui.btnGhost}>Back</Link></div><QuotationForm prefill={prefill} /></div>;
}
