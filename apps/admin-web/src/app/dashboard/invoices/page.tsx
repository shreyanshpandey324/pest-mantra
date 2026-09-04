import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { Invoice, InvoiceStatus } from "@/types/invoice";
import InvoicesClient from "@/components/InvoicesClient";

const INVOICE_STATUSES = new Set<InvoiceStatus>(["draft", "issued", "partially_paid", "paid", "overdue", "void"]);

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const initialStatus = INVOICE_STATUSES.has(params.status as InvoiceStatus) ? params.status as InvoiceStatus : "all";
  const t = (await cookies()).get(ACCESS_COOKIE_NAME)?.value;
  let invoices: Invoice[] = [];
  let error = "";
  try {
    invoices = (await backendFetch<{ invoices: Invoice[] }>("/invoices", { accessToken: t })).invoices;
  } catch (e) {
    error = e instanceof BackendApiError ? e.message : "Could not load invoices";
  }
  return <div className="space-y-6"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-accent">Finance workspace</p><h1 className="mt-1 text-3xl font-semibold">Invoices & Payments</h1><p className="mt-2 text-sm text-ink-muted">Filter pending, partial, overdue and paid invoices instantly, then search any customer or invoice.</p></div>{error && <div className="rounded-xl border border-danger/40 p-4 text-danger">{error}</div>}<InvoicesClient initial={invoices} initialStatus={initialStatus} /></div>;
}
