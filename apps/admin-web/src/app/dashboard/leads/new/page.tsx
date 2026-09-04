import Link from "next/link";
import LeadForm from "@/components/LeadForm";
import { getCurrentUser } from "@/lib/current-user";
import { ui } from "@/lib/ui-classes";

export default async function NewLeadPage() {
  const user = await getCurrentUser();
  return <div className="space-y-6"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-accent">Sales CRM</p><h1 className="mt-1 text-3xl font-semibold">New lead</h1><p className="mt-2 text-sm text-ink-muted">Capture an enquiry, assign ownership and schedule the next action.</p></div><Link href="/dashboard/leads" className={ui.btnGhost}>Back</Link></div><LeadForm user={user} /></div>;
}
