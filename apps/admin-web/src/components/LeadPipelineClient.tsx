"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Lead, LeadListResponse, LeadPriority, LeadSource, LeadStatus, LEAD_PRIORITY_LABELS, LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/types/lead";
import { SERVICE_TYPE_LABELS, ServiceType } from "@/types/project";
import { ui } from "@/lib/ui-classes";

const columns: LeadStatus[] = ["new", "contacted", "follow_up", "qualified", "quotation_sent", "won", "lost"];
const priorityClass: Record<LeadPriority, string> = {
  hot: "border-danger/35 bg-danger/10 text-danger",
  warm: "border-warning/35 bg-warning/10 text-warning",
  cold: "border-border-default bg-surface-2 text-ink-muted",
};
const columnClass: Record<LeadStatus, string> = {
  new: "text-accent",
  contacted: "text-info",
  follow_up: "text-warning",
  qualified: "text-accent",
  quotation_sent: "text-info",
  won: "text-success",
  lost: "text-danger",
};

function dateTime(value?: string) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function followUpState(lead: Lead) {
  if (!lead.followUpAt || ["won", "lost"].includes(lead.status)) return null;
  const due = new Date(lead.followUpAt).getTime();
  const now = Date.now();
  if (due < now) return { label: "Overdue", cls: "text-danger" };
  if (due - now < 86400000) return { label: "Due soon", cls: "text-warning" };
  return { label: dateTime(lead.followUpAt), cls: "text-ink-muted" };
}

export function LeadPipelineClient({ initialData }: { initialData: LeadListResponse }) {
  const [data, setData] = useState(initialData);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<"all" | LeadPriority>("all");
  const [source, setSource] = useState<"all" | LeadSource>("all");
  const [serviceType, setServiceType] = useState<"all" | ServiceType>("all");
  const [overdue, setOverdue] = useState(false);
  const [sort, setSort] = useState("updated_desc");
  const [page, setPage] = useState(initialData.pagination.page || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const first = useRef(true);

  useEffect(() => { const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [searchInput]);

  async function load(targetPage = page) {
    setLoading(true); setError("");
    const params = new URLSearchParams({ page: String(targetPage), pageSize: "100", sort });
    if (search) params.set("search", search);
    if (priority !== "all") params.set("priority", priority);
    if (source !== "all") params.set("source", source);
    if (serviceType !== "all") params.set("serviceType", serviceType);
    if (overdue) params.set("overdue", "true");
    try {
      const response = await fetch(`/api/leads?${params}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Could not load leads");
      setData(json.data);
      setPage(json.data.pagination.page);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load leads"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, priority, source, serviceType, overdue, sort]);

  const grouped = useMemo(() => Object.fromEntries(columns.map((status) => [status, data.leads.filter((lead) => lead.status === status)])) as Record<LeadStatus, Lead[]>, [data.leads]);
  const topSources = data.metrics.sourceBreakdown.slice(0, 4);
  const maxSource = Math.max(1, ...topSources.map((item) => item.count));

  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[
        ["Open pipeline", data.metrics.open, "Active opportunities"],
        ["Hot leads", data.metrics.hot, "Priority attention"],
        ["Follow-ups due", data.metrics.overdueFollowUps + data.metrics.dueToday, `${data.metrics.overdueFollowUps} overdue`],
        ["Won", data.metrics.won, "Closed business"],
        ["Win rate", `${data.metrics.conversionRate}%`, "Won vs closed leads"],
      ].map(([label, value, hint]) => <div className={`${ui.card} p-5`} key={label}><p className="text-[10px] font-bold uppercase tracking-[.18em] text-ink-faint">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-ink-muted">{hint}</p></div>)}
    </div>

    <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
      <div className={`${ui.card} p-4`}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_170px_170px_190px]">
          <input className={ui.input} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search lead, customer, phone or address…" />
          <select className={ui.input} value={priority} onChange={(e) => { setPriority(e.target.value as typeof priority); setPage(1); }}><option value="all">All priorities</option>{Object.entries(LEAD_PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select className={ui.input} value={source} onChange={(e) => { setSource(e.target.value as typeof source); setPage(1); }}><option value="all">All sources</option>{Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select className={ui.input} value={serviceType} onChange={(e) => { setServiceType(e.target.value as typeof serviceType); setPage(1); }}><option value="all">All services</option>{Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => { setOverdue((value) => !value); setPage(1); }} className={`${ui.btnGhostSm} ${overdue ? "border-danger/40 bg-danger/10 text-danger" : ""}`}>◷ Overdue follow-ups</button>
          <select className={`${ui.input} max-w-[210px]`} value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}><option value="updated_desc">Recently active</option><option value="created_desc">Newest leads</option><option value="follow_up_asc">Next follow-up</option></select>
          <button type="button" className={ui.btnGhostSm} onClick={() => { setSearchInput(""); setSearch(""); setPriority("all"); setSource("all"); setServiceType("all"); setOverdue(false); setSort("updated_desc"); setPage(1); }}>Reset</button>
          <Link href="/dashboard/leads/new" className={`${ui.btnPrimary} ml-auto`}>+ New lead</Link>
        </div>
      </div>
      <div className={`${ui.card} p-4`}><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-ink-faint">Lead sources</p><p className="mt-1 text-sm text-ink-muted">Where enquiries originate</p></div><span className="font-mono text-xs text-accent">{data.metrics.total} total</span></div><div className="mt-4 space-y-3">{topSources.length ? topSources.map((item) => <div key={item.source}><div className="mb-1 flex justify-between text-xs"><span>{LEAD_SOURCE_LABELS[item.source]}</span><b>{item.count}</b></div><div className="h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(8, (item.count / maxSource) * 100)}%` }} /></div></div>) : <p className="text-xs text-ink-muted">No source data yet.</p>}</div></div>
    </div>

    {error ? <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
    <div className="flex items-center justify-between text-xs text-ink-muted"><p>{loading ? "Refreshing sales pipeline…" : `${data.pagination.total} matching leads`}</p><p>{data.metrics.qualified} qualified · {data.metrics.overdueFollowUps} overdue</p></div>

    <div className={`overflow-x-auto pb-3 ${loading ? "pointer-events-none opacity-60" : ""}`}>
      <div className="grid min-w-[1960px] grid-cols-7 gap-3">
        {columns.map((status) => <section key={status} className="rounded-2xl border border-border-default bg-surface-2/50 p-3">
          <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full bg-current ${columnClass[status]}`} /><h3 className="text-xs font-bold uppercase tracking-[.14em]">{LEAD_STATUS_LABELS[status]}</h3></div><span className="rounded-full bg-surface px-2 py-0.5 font-mono text-[10px] text-ink-muted">{grouped[status].length}</span></div>
          <div className="space-y-3">{grouped[status].map((lead) => {
            const follow = followUpState(lead);
            return <article key={lead._id} className="rounded-xl border border-border-default bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-border-strong">
              <div className="flex items-start justify-between gap-2"><span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.12em] ${priorityClass[lead.priority]}`}>{LEAD_PRIORITY_LABELS[lead.priority]}</span><span className="font-mono text-[9px] text-ink-faint">{lead.leadNumber}</span></div>
              <h4 className="mt-3 font-semibold leading-tight">{lead.customerName}</h4><p className="mt-1 font-mono text-[11px] text-ink-muted">{lead.customerPhone}</p>
              <p className="mt-3 text-xs text-ink-muted">{SERVICE_TYPE_LABELS[lead.serviceType]}</p>
              <div className="mt-3 border-t border-border-default pt-3 text-[11px]"><p className="text-ink-faint">Owner</p><p className="mt-0.5 truncate font-medium text-ink">{lead.assignedToName ?? "Admin"}</p>{follow ? <p className={`mt-2 font-semibold ${follow.cls}`}>◷ {follow.label}</p> : null}</div>
              <Link href={`/dashboard/leads/${lead._id}`} className={`${ui.btnGhostSm} mt-3 w-full`}>Open lead →</Link>
            </article>;
          })}{!grouped[status].length ? <div className="rounded-xl border border-dashed border-border-default p-5 text-center text-[11px] text-ink-faint">No leads</div> : null}</div>
        </section>)}
      </div>
    </div>

    {data.pagination.totalPages > 1 ? <div className={`${ui.card} flex items-center justify-between p-4`}><p className="text-xs text-ink-muted">Page {data.pagination.page} of {data.pagination.totalPages}</p><div className="flex gap-2"><button disabled={!data.pagination.hasPreviousPage || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className={ui.btnGhostSm}>Previous</button><button disabled={!data.pagination.hasNextPage || loading} onClick={() => setPage((value) => value + 1)} className={ui.btnPrimary}>Next</button></div></div> : null}
  </div>;
}

export default LeadPipelineClient;
