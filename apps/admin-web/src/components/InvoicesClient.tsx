"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Invoice, InvoiceStatus, INVOICE_STATUS_LABELS } from "@/types/invoice";
import { SERVICE_TYPE_LABELS } from "@/types/project";
import { ui } from "@/lib/ui-classes";

const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const statusClass = (s: InvoiceStatus) => s === "paid" ? "text-success border-success/30 bg-success/10" : s === "overdue" || s === "void" ? "text-danger border-danger/30 bg-danger/10" : s === "partially_paid" ? "text-warning border-warning/30 bg-warning/10" : s === "issued" ? "text-accent border-accent/30 bg-accent/10" : "text-ink-muted border-border-default bg-surface-2";

export default function InvoicesClient({ initial, initialStatus = "all" }: { initial: Invoice[]; initialStatus?: InvoiceStatus | "all" }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<InvoiceStatus | "all">(initialStatus);
  const rows = useMemo(() => initial.filter((i) => (status === "all" || i.status === status) && (!search || `${i.invoiceNumber} ${i.customerName} ${i.customerPhone}`.toLowerCase().includes(search.toLowerCase()))), [initial, search, status]);
  const billed = initial.filter(i => i.status !== "void").reduce((s, i) => s + i.grandTotal, 0);
  const collected = initial.reduce((s, i) => s + i.amountPaid, 0);
  const outstanding = initial.filter(i => i.status !== "void").reduce((s, i) => s + i.balanceDue, 0);
  const overdue = initial.filter(i => i.status === "overdue").reduce((s, i) => s + i.balanceDue, 0);

  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[["Total billed", money(billed)], ["Collected", money(collected)], ["Outstanding", money(outstanding)], ["Overdue", money(overdue)]].map(([a, b]) => <div className={`${ui.card} p-5`} key={a}><p className="text-xs uppercase tracking-[.16em] text-ink-faint">{a}</p><p className="mt-2 text-2xl font-semibold">{b}</p></div>)}
    </div>
    <div className={`${ui.card} p-4`}>
      <div className="mb-4 flex flex-wrap gap-2">
        {[{ value: "all", label: "All" }, { value: "issued", label: "Pending" }, { value: "partially_paid", label: "Partial" }, { value: "overdue", label: "Overdue" }, { value: "paid", label: "Paid" }].map((option) => (
          <button key={option.value} type="button" onClick={() => setStatus(option.value as InvoiceStatus | "all")} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${status === option.value ? "border-accent bg-accent text-accent-ink" : "border-border-default bg-surface-2 text-ink-muted hover:border-accent/50 hover:text-ink"}`}>{option.label}</button>
        ))}
      </div>
      <div className="flex flex-col gap-3 md:flex-row"><input className={ui.input} placeholder="Search invoice, customer or phone…" value={search} onChange={e => setSearch(e.target.value)} /><select className={ui.input} value={status} onChange={e => setStatus(e.target.value as InvoiceStatus | "all")}><option value="all">All statuses</option>{Object.entries(INVOICE_STATUS_LABELS).map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select><Link className={`${ui.btnPrimary} shrink-0`} href="/dashboard/invoices/new">+ New invoice</Link></div>
    </div>
    <div className={`${ui.card} overflow-hidden`}><div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead className="bg-surface-2 text-xs uppercase tracking-wider text-ink-faint"><tr>{["Invoice", "Customer", "Service", "Total", "Paid", "Balance", "Due", "Status", ""].map(x => <th className="px-5 py-4" key={x}>{x}</th>)}</tr></thead><tbody className="divide-y divide-border-default">{rows.map(i => <tr key={i._id} className="hover:bg-surface-2/50"><td className="px-5 py-4 font-mono text-accent">{i.invoiceNumber}</td><td className="px-5 py-4"><b>{i.customerName}</b><div className="text-xs text-ink-muted">{i.customerPhone}</div></td><td className="px-5 py-4">{SERVICE_TYPE_LABELS[i.serviceType]}</td><td className="px-5 py-4 font-medium">{money(i.grandTotal)}</td><td className="px-5 py-4 text-success">{money(i.amountPaid)}</td><td className="px-5 py-4">{money(i.balanceDue)}</td><td className="px-5 py-4 text-ink-muted">{new Date(i.dueDate).toLocaleDateString("en-IN")}</td><td className="px-5 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(i.status)}`}>{INVOICE_STATUS_LABELS[i.status]}</span></td><td className="px-5 py-4 text-right"><Link className={ui.btnGhostSm} href={`/dashboard/invoices/${i._id}`}>Open</Link></td></tr>)}{!rows.length && <tr><td colSpan={9} className="px-6 py-14 text-center text-ink-muted">No invoices match this view.</td></tr>}</tbody></table></div></div>
  </div>;
}
