"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Expense, ExpenseCategory, ExpenseStatus, FinanceSummary, EXPENSE_CATEGORY_LABELS, EXPENSE_PAYMENT_METHOD_LABELS, EXPENSE_STATUS_LABELS } from "@/types/expense";
import { Project, TechnicianListItem, SERVICE_TYPE_LABELS } from "@/types/project";
import { ui } from "@/lib/ui-classes";
import { ExpenseForm } from "@/components/ExpenseForm";

const CHART_GREEN = "#3ddc84";
const CHART_GREEN_SOFT = "#55e596";
const CHART_YELLOW = "#ffc94d";
const CHART_RED = "#ff5c5c";
const CHART_BLUE = "#60a5fa";
const CHART_TEXT = "#9aa1ac";
const CHART_GRID = "#2a2f3a";
const PIE = [CHART_GREEN, CHART_BLUE, CHART_YELLOW, "#a78bfa", "#22d3ee", "#f97316", "#f472b6", "#94a3b8", "#84cc16", CHART_RED];
const tooltipStyle = { background: "#171a21", border: "1px solid #2a2f3a", borderRadius: 12, color: "#f2f1ed", boxShadow: "0 12px 30px rgba(0,0,0,.35)" };
const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const compactMoney = (n: number) => new Intl.NumberFormat("en-IN", { notation: "compact", style: "currency", currency: "INR", maximumFractionDigits: 1 }).format(n || 0);
const formatDate = (v: string) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v));

function statusClass(status: ExpenseStatus) {
  if (status === "paid") return "border-success/30 bg-success/10 text-success";
  if (status === "approved") return "border-accent/30 bg-accent/10 text-accent";
  if (status === "rejected") return "border-danger/30 bg-danger/10 text-danger";
  return "border-warning/30 bg-warning/10 text-warning";
}

function projectLabel(expense: Expense) {
  const p = expense.projectId;
  return p && typeof p === "object" ? p.projectCode : "—";
}
function techLabel(expense: Expense) {
  const t = expense.technicianId;
  return t && typeof t === "object" ? t.name : "—";
}

export function ExpensesProfitClient({ initialExpenses, initialSummary, projects, technicians, initialFrom, initialTo }: {
  initialExpenses: Expense[];
  initialSummary: FinanceSummary;
  projects: Project[];
  technicians: TechnicianListItem[];
  initialFrom: string;
  initialTo: string;
}) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [summary, setSummary] = useState(initialSummary);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ExpenseStatus | "all">("all");
  const [category, setCategory] = useState<ExpenseCategory | "all">("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const filtered = useMemo(() => expenses.filter(e => {
    if (status !== "all" && e.status !== status) return false;
    if (category !== "all" && e.category !== category) return false;
    if (search && !`${e.expenseNumber} ${e.description} ${e.vendor || ""} ${projectLabel(e)} ${techLabel(e)}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [expenses, status, category, search]);

  async function reload(nextFrom = from, nextTo = to) {
    setBusy(true); setMessage(null);
    try {
      const params = new URLSearchParams(); if (nextFrom) params.set("from", nextFrom); if (nextTo) params.set("to", nextTo);
      const [listRes, sumRes] = await Promise.all([fetch(`/api/expenses?${params}`), fetch(`/api/expenses/summary?${params}`)]);
      const [listJson, sumJson] = await Promise.all([listRes.json(), sumRes.json()]);
      if (!listRes.ok || !listJson.success) throw new Error(listJson.message || "Could not load expenses");
      if (!sumRes.ok || !sumJson.success) throw new Error(sumJson.message || "Could not load profit summary");
      setExpenses(listJson.data.expenses); setSummary(sumJson.data.summary);
    } catch (e) { setMessage({ tone: "danger", text: e instanceof Error ? e.message : "Could not refresh finance data" }); }
    finally { setBusy(false); }
  }

  async function changeStatus(expense: Expense, target: "approved" | "rejected" | "paid") {
    let note: string | undefined;
    if (target === "rejected") {
      const reason = window.prompt("Reason for rejecting this expense:");
      if (reason === null) return;
      note = reason.trim() || undefined;
    }
    if (!window.confirm(target === "paid" ? `Mark ${expense.expenseNumber} as paid?` : `${target === "approved" ? "Approve" : "Reject"} ${expense.expenseNumber}?`)) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/expenses/${expense._id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: target, note }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Status update failed");
      setMessage({ tone: "success", text: target === "paid" ? "Expense marked as paid." : `Expense ${target}.` });
      await reload();
    } catch (e) { setMessage({ tone: "danger", text: e instanceof Error ? e.message : "Status update failed" }); setBusy(false); }
  }

  async function remove(expense: Expense) {
    if (!window.confirm(`Delete ${expense.expenseNumber}? This cannot be undone.`)) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/expenses/${expense._id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Delete failed");
      setMessage({ tone: "success", text: "Expense deleted." }); await reload();
    } catch (e) { setMessage({ tone: "danger", text: e instanceof Error ? e.message : "Delete failed" }); setBusy(false); }
  }

  async function uploadReceipt(expense: Expense, file: File) {
    setBusy(true); setMessage(null);
    try {
      const form = new FormData(); form.append("receipt", file);
      const response = await fetch(`/api/expenses/${expense._id}/receipt`, { method: "POST", body: form });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Receipt upload failed");
      setMessage({ tone: "success", text: "Receipt uploaded." }); await reload();
    } catch (e) { setMessage({ tone: "danger", text: e instanceof Error ? e.message : "Receipt upload failed" }); setBusy(false); }
  }

  function exportCsv() {
    const rows = [["Expense #", "Date", "Category", "Description", "Vendor", "Project", "Technician", "Amount", "Status", "Payment method"], ...filtered.map(e => [e.expenseNumber, e.expenseDate.slice(0,10), EXPENSE_CATEGORY_LABELS[e.category], e.description, e.vendor || "", projectLabel(e), techLabel(e), String(e.amount), EXPENSE_STATUS_LABELS[e.status], e.paymentMethod ? EXPENSE_PAYMENT_METHOD_LABELS[e.paymentMethod] : ""])];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `pest-mantra-expenses-${from || "all"}-${to || "all"}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  const categoryData = summary.categoryBreakdown.map(x => ({ name: EXPENSE_CATEGORY_LABELS[x.category], value: x.amount }));
  const performanceData = [
    { name: "Billed", value: summary.billedRevenue, fill: CHART_BLUE },
    { name: "Collected", value: summary.collectedRevenue, fill: CHART_GREEN },
    { name: "Recognized cost", value: summary.recognizedCost, fill: CHART_YELLOW },
    { name: "Est. profit", value: summary.estimatedProfit, fill: summary.estimatedProfit >= 0 ? CHART_GREEN_SOFT : CHART_RED },
  ];

  return <div className="space-y-7">
    {message ? <div className={`rounded-xl border px-4 py-3 text-sm ${message.tone === "success" ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"}`}>{message.text}</div> : null}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      <Kpi label="Billed revenue" value={money(summary.billedRevenue)} sub={`${summary.invoiceCount} invoices`} icon="₹" />
      <Kpi label="Collected" value={money(summary.collectedRevenue)} sub={`${money(summary.outstanding)} receivable`} icon="✓" />
      <Kpi label="Recognized costs" value={money(summary.recognizedCost)} sub={`${money(summary.paidExpenses)} paid`} icon="↓" />
      <Kpi label="Estimated profit" value={money(summary.estimatedProfit)} sub={`${summary.estimatedMargin}% margin`} icon="↗" tone={summary.estimatedProfit < 0 ? "danger" : "success"} />
      <Kpi label="Cash profit" value={money(summary.cashProfit)} sub="Collections − paid expenses" icon="◈" tone={summary.cashProfit < 0 ? "danger" : "success"} />
      <Kpi label="Pending approval" value={money(summary.pendingApproval)} sub={`${summary.expenseCount} expense records`} icon="!" tone="warning" />
    </section>

    <section className={`${ui.card} p-4`}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-ink-muted">From<input type="date" className={`${ui.input} mt-1`} value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label className="text-xs text-ink-muted">To<input type="date" className={`${ui.input} mt-1`} value={to} onChange={e => setTo(e.target.value)} /></label>
          <label className="text-xs text-ink-muted">Status<select className={`${ui.input} mt-1`} value={status} onChange={e => setStatus(e.target.value as ExpenseStatus | "all")}><option value="all">All statuses</option>{Object.entries(EXPENSE_STATUS_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="text-xs text-ink-muted">Category<select className={`${ui.input} mt-1`} value={category} onChange={e => setCategory(e.target.value as ExpenseCategory | "all")}><option value="all">All categories</option>{Object.entries(EXPENSE_CATEGORY_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={ui.btnGhost} disabled={busy} onClick={() => reload()}>{busy ? "Refreshing…" : "Apply dates"}</button>
          <button className={ui.btnGhost} onClick={exportCsv}>Export CSV</button>
          <button className={ui.btnPrimary} onClick={() => { setEditing(null); setFormOpen(true); }}>+ Add expense</button>
        </div>
      </div>
      <input className={`${ui.input} mt-3`} placeholder="Search expense number, vendor, description, project or technician…" value={search} onChange={e => setSearch(e.target.value)} />
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
      <ChartCard title="Revenue vs cost" subtitle="Billed and collected invoice value compared with approved/paid operating costs">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={performanceData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: CHART_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={compactMoney} tick={{ fill: CHART_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: unknown) => money(Number(value || 0))} />
            <Bar dataKey="value" radius={[9,9,0,0]} maxBarSize={64}>{performanceData.map(row => <Cell key={row.name} fill={row.fill} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Expense mix" subtitle="Approved and paid costs by category">
        {categoryData.length ? <div className="grid items-center gap-3 sm:grid-cols-[1fr_190px]">
          <ResponsiveContainer width="100%" height={280}><PieChart><Tooltip contentStyle={tooltipStyle} formatter={(value: unknown) => money(Number(value || 0))} /><Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} paddingAngle={3} stroke="none">{categoryData.map((_,i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}</Pie></PieChart></ResponsiveContainer>
          <div className="space-y-2">{categoryData.map((row,i) => <div key={row.name} className="flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-2 text-ink-muted"><span className="h-2 w-2 rounded-full" style={{backgroundColor: PIE[i % PIE.length]}} />{row.name}</span><span className="font-mono text-ink">{money(row.value)}</span></div>)}</div>
        </div> : <Empty text="No approved expenses in this period." />}
      </ChartCard>
    </section>

    <section className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Service profitability" subtitle="Invoice value minus approved project-linked expenses by service type">
        {summary.serviceProfitability.length ? <ResponsiveContainer width="100%" height={320}><BarChart data={summary.serviceProfitability.map(x => ({...x, name: SERVICE_TYPE_LABELS[x.serviceType]}))} margin={{top:10,right:8,left:0,bottom:24}}><CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" tick={{fill:CHART_TEXT,fontSize:11}} axisLine={false} tickLine={false} angle={-12} textAnchor="end" height={45}/><YAxis tickFormatter={compactMoney} tick={{fill:CHART_TEXT,fontSize:11}} axisLine={false} tickLine={false} width={70}/><Tooltip contentStyle={tooltipStyle} formatter={(value: unknown) => money(Number(value || 0))}/><Bar dataKey="revenue" name="Revenue" fill={CHART_BLUE} radius={[6,6,0,0]}/><Bar dataKey="expenses" name="Expenses" fill={CHART_YELLOW} radius={[6,6,0,0]}/><Bar dataKey="profit" name="Profit" fill={CHART_GREEN} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer> : <Empty text="Link expenses to projects to unlock service profitability." />}
      </ChartCard>
      <div className={`${ui.card} overflow-hidden`}>
        <div className="border-b border-border-default px-5 py-4"><h2 className="font-semibold">Branch profitability</h2><p className="mt-1 text-xs text-ink-muted">Useful for Super Admin multi-branch comparison.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-surface-2 text-xs uppercase tracking-wider text-ink-faint"><tr><th className="px-5 py-3">Branch</th><th className="px-5 py-3">Revenue</th><th className="px-5 py-3">Costs</th><th className="px-5 py-3">Profit</th></tr></thead><tbody className="divide-y divide-border-default">{summary.branchProfitability.map(b => <tr key={b.branchId}><td className="px-5 py-4 font-medium">{b.branchName}</td><td className="px-5 py-4">{money(b.revenue)}</td><td className="px-5 py-4 text-warning">{money(b.expenses)}</td><td className={`px-5 py-4 font-semibold ${b.profit >= 0 ? "text-success" : "text-danger"}`}>{money(b.profit)}</td></tr>)}{!summary.branchProfitability.length ? <tr><td colSpan={4} className="px-5 py-12 text-center text-ink-muted">No branch-level finance data in this period.</td></tr> : null}</tbody></table></div>
      </div>
    </section>

    <section className={`${ui.card} overflow-hidden`}>
      <div className="flex flex-col gap-2 border-b border-border-default px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Expense register</h2><p className="mt-1 text-xs text-ink-muted">Approval-controlled, receipt-backed operating expenses.</p></div><span className="font-mono text-xs text-ink-faint">{filtered.length} shown</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1250px] text-left text-sm"><thead className="bg-surface-2 text-xs uppercase tracking-wider text-ink-faint"><tr>{["Expense", "Date", "Category", "Description", "Project", "Claimant", "Amount", "Status", "Receipt", "Actions"].map(x => <th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-border-default">{filtered.map(e => <tr key={e._id} className="align-top hover:bg-surface-2/40"><td className="px-4 py-4 font-mono text-xs text-accent">{e.expenseNumber}</td><td className="px-4 py-4 text-ink-muted">{formatDate(e.expenseDate)}</td><td className="px-4 py-4">{EXPENSE_CATEGORY_LABELS[e.category]}</td><td className="max-w-[260px] px-4 py-4"><p className="font-medium">{e.description}</p><p className="mt-1 text-xs text-ink-muted">{e.vendor || "No vendor"}{e.paymentMethod ? ` · ${EXPENSE_PAYMENT_METHOD_LABELS[e.paymentMethod]}` : ""}</p></td><td className="px-4 py-4 text-ink-muted">{projectLabel(e)}</td><td className="px-4 py-4 text-ink-muted">{techLabel(e)}</td><td className="px-4 py-4 text-base font-semibold">{money(e.amount)}</td><td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs ${statusClass(e.status)}`}>{EXPENSE_STATUS_LABELS[e.status]}</span>{e.approvalNote ? <p className="mt-2 max-w-[180px] text-xs text-ink-faint">{e.approvalNote}</p> : null}</td><td className="px-4 py-4">{e.receiptOriginalName ? <a href={`/api/expenses/${e._id}/receipt`} target="_blank" rel="noreferrer" className={ui.btnGhostSm}>View</a> : <label className={`${ui.btnGhostSm} cursor-pointer`}>Upload<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={ev => { const file=ev.target.files?.[0]; if(file) void uploadReceipt(e,file); ev.currentTarget.value=""; }} /></label>}</td><td className="px-4 py-4"><div className="flex max-w-[240px] flex-wrap gap-1.5">{e.status === "pending" ? <><button className={ui.btnGhostSm} onClick={() => { setEditing(e); setFormOpen(true); }}>Edit</button><button className="h-8 rounded-md border border-success/30 bg-success/10 px-3 text-xs font-semibold text-success" onClick={() => void changeStatus(e,"approved")}>Approve</button><button className="h-8 rounded-md border border-danger/30 bg-danger/10 px-3 text-xs font-semibold text-danger" onClick={() => void changeStatus(e,"rejected")}>Reject</button></> : null}{e.status === "approved" ? <button className="h-8 rounded-md border border-success/30 bg-success/10 px-3 text-xs font-semibold text-success" onClick={() => void changeStatus(e,"paid")}>Mark paid</button> : null}{e.status === "pending" || e.status === "rejected" ? <button className={ui.btnGhostSm} onClick={() => void remove(e)}>Delete</button> : null}</div></td></tr>)}{!filtered.length ? <tr><td colSpan={10} className="px-6 py-14 text-center text-ink-muted">No expenses match this view.</td></tr> : null}</tbody></table></div>
    </section>

    {formOpen ? <div className="fixed inset-0 z-[100] overflow-y-auto pm-modal-backdrop p-4"><div className="mx-auto my-6 max-w-3xl rounded-3xl border border-border-default bg-surface shadow-2xl"><div className="flex items-start justify-between border-b border-border-default px-6 py-5"><div><p className="font-mono text-xs uppercase tracking-[.18em] text-accent">Finance control</p><h2 className="mt-1 text-xl font-semibold">{editing ? `Edit ${editing.expenseNumber}` : "Record new expense"}</h2><p className="mt-1 text-xs text-ink-muted">New expenses start in Pending Approval and do not affect recognized profit until approved.</p></div><button className="text-2xl text-ink-muted hover:text-ink" onClick={() => { setFormOpen(false); setEditing(null); }} aria-label="Close">×</button></div><div className="p-6"><ExpenseForm projects={projects} technicians={technicians} expense={editing} onCancel={() => { setFormOpen(false); setEditing(null); }} onDone={() => { setFormOpen(false); setEditing(null); setMessage({tone:"success",text: editing ? "Expense updated." : "Expense created and sent for approval."}); void reload(); }} /></div></div></div> : null}
  </div>;
}

function Kpi({ label, value, sub, icon, tone = "default" }: { label: string; value: string; sub: string; icon: string; tone?: "default"|"success"|"warning"|"danger" }) {
  const color = tone === "success" ? "text-success bg-success/10 border-success/20" : tone === "warning" ? "text-warning bg-warning/10 border-warning/20" : tone === "danger" ? "text-danger bg-danger/10 border-danger/20" : "text-accent bg-accent/10 border-accent/20";
  return <div className={`${ui.card} relative overflow-hidden p-5`}><div className="flex items-start justify-between"><p className="text-xs uppercase tracking-[.12em] text-ink-faint">{label}</p><span className={`grid h-8 w-8 place-items-center rounded-lg border ${color}`}>{icon}</span></div><p className={`mt-4 text-2xl font-semibold tracking-tight ${tone === "danger" ? "text-danger" : ""}`}>{value}</p><p className="mt-1 text-xs text-ink-muted">{sub}</p></div>;
}
function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <div className={`${ui.card} p-5`}><div className="mb-4"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs text-ink-muted">{subtitle}</p></div>{children}</div>; }
function Empty({ text }: { text: string }) { return <div className="grid h-[280px] place-items-center rounded-xl border border-dashed border-border-default text-sm text-ink-muted">{text}</div>; }
