import { cookies } from "next/headers";
import Link from "next/link";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch } from "@/lib/backend-client";
import { Project } from "@/types/project";
import { Quotation } from "@/types/quotation";
import InvoiceForm from "@/components/InvoiceForm";
import { ui } from "@/lib/ui-classes";
export default async function Page() { const t = (await cookies()).get(ACCESS_COOKIE_NAME)?.value; const [projects, quotations] = await Promise.all([backendFetch<{ projects: Project[] }>("/projects", { accessToken: t }).then(x => x.projects).catch(() => []), backendFetch<{ quotations: Quotation[] }>("/quotations", { accessToken: t }).then(x => x.quotations).catch(() => [])]); return <div className="space-y-6"><div className="flex items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-accent">Finance workspace</p><h1 className="mt-1 text-3xl font-semibold">Create invoice</h1><p className="mt-2 text-sm text-ink-muted">Bill a real Pest Mantra project using quotation pricing or custom service line items.</p></div><Link className={ui.btnGhost} href="/dashboard/invoices">Back</Link></div><InvoiceForm projects={projects} quotations={quotations} /></div>; }
