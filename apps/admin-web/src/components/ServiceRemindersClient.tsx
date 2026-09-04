"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SERVICE_TYPE_LABELS, ServiceType } from "@/types/project";
import { ServiceReminder, ServiceReminderListResponse, ServiceReminderTiming } from "@/types/serviceReminder";
import { ui } from "@/lib/ui-classes";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function serviceLabel(value: string) { return SERVICE_TYPE_LABELS[value as ServiceType] ?? value.replaceAll("_", " "); }
function timingLabel(timing: ServiceReminderTiming, days: number) {
  if (timing === "overdue") return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (timing === "due_today") return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days} days to go`;
}
function timingClass(timing: ServiceReminderTiming) {
  if (timing === "overdue") return "border-danger/30 bg-danger/10 text-danger";
  if (timing === "due_today" || timing === "due_soon") return "border-warning/30 bg-warning/10 text-warning";
  if (timing === "upcoming") return "border-accent/30 bg-accent/10 text-accent";
  return "border-border-default bg-surface-2 text-ink-muted";
}

const serviceOptions = Object.entries(SERVICE_TYPE_LABELS);
const timingQuickFilters: Array<{ value: "all" | ServiceReminderTiming; label: string }> = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "due_today", label: "Today" },
  { value: "due_soon", label: "1–2 days" },
  { value: "upcoming", label: "3–7 days" },
  { value: "scheduled", label: "Later" },
];

export function ServiceRemindersClient({
  initialData,
  initialTiming = "all",
}: {
  initialData: ServiceReminderListResponse;
  initialTiming?: "all" | ServiceReminderTiming;
}) {
  const [data, setData] = useState(initialData);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [timing, setTiming] = useState<"all" | ServiceReminderTiming>(initialTiming);
  const [serviceType, setServiceType] = useState("all");
  const [unread, setUnread] = useState<"all" | "true" | "false">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<"due_asc" | "due_desc" | "created_desc">("due_asc");
  const [page, setPage] = useState(initialData.pagination.page || 1);
  const [pageSize, setPageSize] = useState(initialData.pagination.pageSize || 25);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const firstLoad = useRef(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  function buildUrl(targetPage = page) {
    const params = new URLSearchParams({ page: String(targetPage), pageSize: String(pageSize), sort });
    if (search) params.set("search", search);
    if (timing !== "all") params.set("timing", timing);
    if (serviceType !== "all") params.set("serviceType", serviceType);
    if (unread !== "all") params.set("unread", unread);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/service-reminders?${params.toString()}`;
  }

  async function load(targetPage = page, silent = false) {
    if (!silent) setLoading(true);
    setError("");
    try {
      const response = await fetch(buildUrl(targetPage), { cache: "no-store" });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Could not refresh service reminders");
      setData(json.data);
      if (json.data.pagination.page !== page) setPage(json.data.pagination.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load service reminders");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (firstLoad.current) { firstLoad.current = false; return; }
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, timing, serviceType, unread, from, to, sort]);

  async function reload() { await load(page, true); }

  async function markRead(id: string) {
    setBusy(`read:${id}`); setError("");
    try { const response = await fetch(`/api/service-reminders/${id}/read`, { method: "PATCH" }); const json = await response.json(); if (!response.ok || !json.success) throw new Error(json.message || "Could not mark reminder read"); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update reminder"); }
    finally { setBusy(null); }
  }

  async function reschedule(item: ServiceReminder) {
    const current = item.dueDate.slice(0, 10);
    const value = window.prompt("Enter the new next-service date (YYYY-MM-DD)", current);
    if (!value || value === current) return;
    setBusy(`date:${item.id}`); setError("");
    try { const response = await fetch(`/api/service-reminders/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dueDate: value, notes: item.notes }) }); const json = await response.json(); if (!response.ok || !json.success) throw new Error(json.message || "Could not reschedule service"); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not reschedule service"); }
    finally { setBusy(null); }
  }

  async function createNextJob(item: ServiceReminder) {
    if (!window.confirm(`Create a new ${serviceLabel(item.serviceType)} job for ${item.customerName}?`)) return;
    setBusy(`job:${item.id}`); setError("");
    try { const response = await fetch(`/api/service-reminders/${item.id}/create-project`, { method: "POST" }); const json = await response.json(); if (!response.ok || !json.success) throw new Error(json.message || "Could not create follow-up job"); const projectId = json.data?.project?._id; await reload(); if (projectId) window.location.href = `/dashboard/projects/${projectId}`; }
    catch (e) { setError(e instanceof Error ? e.message : "Could not create follow-up job"); }
    finally { setBusy(null); }
  }

  function resetFilters() {
    setSearchInput(""); setSearch(""); setTiming("all"); setServiceType("all"); setUnread("all"); setFrom(""); setTo(""); setSort("due_asc"); setPage(1);
  }

  const cards = useMemo(() => [
    { label: "Active reminders", value: data.metrics.total, hint: "All customers awaiting follow-up" },
    { label: "Due today", value: data.metrics.dueToday, hint: "Needs action today" },
    { label: "Next 7 days", value: data.metrics.next7Days, hint: "Upcoming follow-ups" },
    { label: "Overdue", value: data.metrics.overdue, hint: "Needs rescheduling/action" },
  ], [data.metrics]);

  const start = data.pagination.total ? (data.pagination.page - 1) * data.pagination.pageSize + 1 : 0;
  const end = Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.total);
  const hasFilters = Boolean(search || timing !== "all" || serviceType !== "all" || unread !== "all" || from || to || sort !== "due_asc");

  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className={`${ui.card} p-5`}><p className="text-[10px] font-bold uppercase tracking-[.18em] text-ink-faint">{card.label}</p><p className="mt-3 text-3xl font-semibold">{card.value}</p><p className="mt-1 text-xs text-ink-muted">{card.hint}</p></div>)}</div>

    <div className={`${ui.card} p-4`}>
      <div className="mb-4 flex flex-wrap gap-2 border-b border-border-default pb-4">
        {timingQuickFilters.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => { setTiming(option.value); setPage(1); }}
            className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
              timing === option.value
                ? "border-accent bg-accent text-accent-ink"
                : "border-border-default bg-surface-2 text-ink-muted hover:border-accent/50 hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-[minmax(260px,1.4fr)_190px_190px_150px]">
        <input className={ui.input} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search customer, mobile or address…" />
        <select className={ui.input} value={timing} onChange={(e) => { setTiming(e.target.value as typeof timing); setPage(1); }}><option value="all">All due states</option><option value="overdue">Overdue</option><option value="due_today">Due today</option><option value="due_soon">Due in 1–2 days</option><option value="upcoming">Due in 3–7 days</option><option value="scheduled">Scheduled later</option></select>
        <select className={ui.input} value={serviceType} onChange={(e) => { setServiceType(e.target.value); setPage(1); }}><option value="all">All service types</option>{serviceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select className={ui.input} value={unread} onChange={(e) => { setUnread(e.target.value as typeof unread); setPage(1); }}><option value="all">Read + unread</option><option value="true">Unread only</option><option value="false">Read only</option></select>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[170px_170px_190px_140px_auto] lg:items-end">
        <label className="text-xs text-ink-muted">From<input type="date" className={`${ui.input} mt-1`} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
        <label className="text-xs text-ink-muted">To<input type="date" className={`${ui.input} mt-1`} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
        <label className="text-xs text-ink-muted">Sort<select className={`${ui.input} mt-1`} value={sort} onChange={(e) => { setSort(e.target.value as typeof sort); setPage(1); }}><option value="due_asc">Nearest due first</option><option value="due_desc">Latest due first</option><option value="created_desc">Newest reminder first</option></select></label>
        <label className="text-xs text-ink-muted">Rows<select className={`${ui.input} mt-1`} value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
        <button type="button" disabled={!hasFilters} onClick={resetFilters} className={ui.btnGhostSm}>Reset filters</button>
      </div>
    </div>

    {error ? <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
      <p>{loading ? "Loading reminders…" : data.pagination.total ? `Showing ${start}–${end} of ${data.pagination.total} matching reminders` : "No matching reminders"}</p>
      <p>{data.metrics.unread} unread across all active reminders</p>
    </div>

    <div className={`space-y-3 ${loading ? "pointer-events-none opacity-55" : ""}`}>{data.reminders.length ? data.reminders.map((item) => <article key={item.id} className={`${ui.card} overflow-hidden`}>
      <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] ${timingClass(item.timing)}`}>{timingLabel(item.timing, item.daysUntil)}</span>{!item.adminReadAt ? <span className="rounded-full bg-accent px-2 py-1 text-[10px] font-black uppercase text-accent-ink">New</span> : null}</div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1"><h3 className="text-lg font-semibold">{item.customerName}</h3><span className="font-mono text-xs text-ink-faint">{item.customerPhone}</span></div>
          <p className="mt-1 text-sm text-ink-muted">{serviceLabel(item.serviceType)} · {item.address}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-xs"><span><span className="text-ink-faint">Next service</span> <b className="ml-1 text-ink">{formatDate(item.dueDate)}</b></span><Link className="font-semibold text-accent hover:underline" href={`/dashboard/projects/${item.sourceProjectId}`}>Previous job</Link></div>
          {item.notes ? <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-xs leading-5 text-ink-muted">{item.notes}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2 lg:max-w-[360px] lg:justify-end">
          {!item.adminReadAt ? <button disabled={busy === `read:${item.id}`} onClick={() => markRead(item.id)} className={ui.btnGhostSm}>Mark read</button> : null}
          <button disabled={busy === `date:${item.id}`} onClick={() => reschedule(item)} className={ui.btnGhostSm}>Reschedule</button>
          <button disabled={busy === `job:${item.id}`} onClick={() => createNextJob(item)} className={ui.btnPrimary}>{busy === `job:${item.id}` ? "Creating…" : "Create next job"}</button>
        </div>
      </div>
    </article>) : <div className="rounded-2xl border border-dashed border-border-default bg-surface p-12 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-accent">✓</div><h3 className="mt-4 font-semibold">No reminders in this view</h3><p className="mt-2 text-sm text-ink-muted">Try a different filter or date range.</p></div>}</div>

    {data.pagination.totalPages > 1 ? <div className={`${ui.card} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}><p className="text-xs text-ink-muted">Page <b className="text-ink">{data.pagination.page}</b> of <b className="text-ink">{data.pagination.totalPages}</b></p><div className="flex gap-2"><button disabled={!data.pagination.hasPreviousPage || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className={ui.btnGhostSm}>Previous</button><button disabled={!data.pagination.hasNextPage || loading} onClick={() => setPage((value) => value + 1)} className={ui.btnPrimary}>Next</button></div></div> : null}
  </div>;
}
