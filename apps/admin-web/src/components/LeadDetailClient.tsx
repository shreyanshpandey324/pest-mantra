"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Lead, LeadActivityType, LeadAssignee, LeadPriority, LeadSource, LeadStatus, LEAD_PRIORITY_LABELS, LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/types/lead";
import { SERVICE_TYPE_LABELS, ServiceType } from "@/types/project";
import { ui } from "@/lib/ui-classes";

const transitions: Record<LeadStatus, LeadStatus[]> = {
  new: ["contacted", "follow_up", "qualified", "lost"],
  contacted: ["follow_up", "qualified", "lost"],
  follow_up: ["contacted", "qualified", "lost"],
  qualified: ["follow_up", "quotation_sent", "won", "lost"],
  quotation_sent: ["follow_up", "won", "lost"],
  won: [],
  lost: ["follow_up"],
};
const statusClass: Record<LeadStatus, string> = {
  new: "border-accent/30 bg-accent/10 text-accent",
  contacted: "border-info/30 bg-info/10 text-info",
  follow_up: "border-warning/30 bg-warning/10 text-warning",
  qualified: "border-accent/30 bg-accent/10 text-accent",
  quotation_sent: "border-info/30 bg-info/10 text-info",
  won: "border-success/30 bg-success/10 text-success",
  lost: "border-danger/30 bg-danger/10 text-danger",
};
const priorityClass: Record<LeadPriority, string> = { hot: "text-danger", warm: "text-warning", cold: "text-ink-muted" };
const activityLabel: Record<LeadActivityType, string> = { note: "Note", call: "Call", follow_up: "Follow-up", site_visit: "Site visit", status_change: "Status", quotation: "Quotation" };

function fmt(value?: string) { return value ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not set"; }

export default function LeadDetailClient({ initialLead }: { initialLead: Lead }) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activityType, setActivityType] = useState<LeadActivityType>("note");
  const [activityNote, setActivityNote] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [editing, setEditing] = useState(false);
  const [assignees, setAssignees] = useState<LeadAssignee[]>([]);
  const [edit, setEdit] = useState({
    customerName: lead.customerName,
    customerPhone: lead.customerPhone,
    customerEmail: lead.customerEmail ?? "",
    address: lead.address ?? "",
    city: lead.city ?? "",
    serviceType: lead.serviceType,
    source: lead.source,
    sourceDetail: lead.sourceDetail ?? "",
    priority: lead.priority,
    assignedTo: lead.assignedTo,
    followUpAt: lead.followUpAt ? new Date(lead.followUpAt).toISOString().slice(0, 16) : "",
    siteVisitAt: lead.siteVisitAt ? new Date(lead.siteVisitAt).toISOString().slice(0, 16) : "",
    notes: lead.notes ?? "",
  });

  useEffect(() => {
    void fetch(`/api/leads/assignees?companyId=${encodeURIComponent(lead.companyId)}&branchId=${encodeURIComponent(lead.branchId)}`, { cache: "no-store" })
      .then((response) => response.json().then((json) => ({ response, json })))
      .then(({ response, json }) => { if (response.ok && json.success) setAssignees(json.data.assignees ?? []); })
      .catch(() => undefined);
  }, [lead.companyId, lead.branchId]);

  async function changeStatus(status: LeadStatus) {
    let lostReason: string | undefined;
    if (status === "lost") {
      lostReason = window.prompt("Why was this lead lost?")?.trim();
      if (!lostReason) return;
    }
    if (!window.confirm(`Move ${lead.customerName} to ${LEAD_STATUS_LABELS[status]}?`)) return;
    setBusy(`status:${status}`); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/leads/${lead._id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, lostReason }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Could not update status");
      setLead(json.data.lead); setSuccess(`Lead moved to ${LEAD_STATUS_LABELS[status]}.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update status"); }
    finally { setBusy(""); }
  }

  async function addActivity(event: FormEvent) {
    event.preventDefault();
    if (!activityNote.trim()) return;
    setBusy("activity"); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/leads/${lead._id}/activities`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: activityType, note: activityNote.trim(), scheduledFor: scheduledFor || undefined }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Could not add activity");
      setLead(json.data.lead); setActivityNote(""); setScheduledFor(""); setSuccess("Activity added to timeline.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add activity"); }
    finally { setBusy(""); }
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    setBusy("edit"); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/leads/${lead._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...edit, customerEmail: edit.customerEmail || undefined, address: edit.address || undefined, city: edit.city || undefined, sourceDetail: edit.sourceDetail || undefined, followUpAt: edit.followUpAt || undefined, siteVisitAt: edit.siteVisitAt || undefined, notes: edit.notes || undefined }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Could not update lead");
      setLead(json.data.lead); setEditing(false); setSuccess("Lead details updated.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update lead"); }
    finally { setBusy(""); }
  }

  async function remove() {
    if (!window.confirm(`Delete ${lead.leadNumber}? This cannot be undone.`)) return;
    setBusy("delete"); setError("");
    try {
      const response = await fetch(`/api/leads/${lead._id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Could not delete lead");
      router.push("/dashboard/leads"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete lead"); setBusy(""); }
  }

  const timeline = useMemo(() => lead.activities ?? [], [lead.activities]);

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
    <div className="space-y-5">
      {error ? <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      {success ? <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{success}</div> : null}

      <section className={`${ui.card} overflow-hidden`}>
        <div className="border-b border-border-default p-6"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] ${statusClass[lead.status]}`}>{LEAD_STATUS_LABELS[lead.status]}</span><span className={`text-xs font-bold uppercase ${priorityClass[lead.priority]}`}>{LEAD_PRIORITY_LABELS[lead.priority]} lead</span></div><h2 className="mt-3 text-2xl font-semibold">{lead.customerName}</h2><p className="mt-1 font-mono text-sm text-ink-muted">{lead.leadNumber} · {lead.customerPhone}</p></div><button type="button" className={ui.btnGhostSm} onClick={() => setEditing((value) => !value)}>{editing ? "Close edit" : "Edit details"}</button></div></div>
        {!editing ? <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {[['Service', SERVICE_TYPE_LABELS[lead.serviceType]], ['Source', `${LEAD_SOURCE_LABELS[lead.source]}${lead.sourceDetail ? ` · ${lead.sourceDetail}` : ''}`], ['Owner', lead.assignedToName ?? 'Admin'], ['Follow-up', fmt(lead.followUpAt)], ['Site visit', fmt(lead.siteVisitAt)], ['Created', fmt(lead.createdAt)]].map(([label, value]) => <div key={label}><p className="text-[10px] font-bold uppercase tracking-[.15em] text-ink-faint">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>)}
          <div className="sm:col-span-2 lg:col-span-3"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-ink-faint">Address</p><p className="mt-1 text-sm text-ink-muted">{[lead.address, lead.city].filter(Boolean).join(', ') || 'Not provided'}</p></div>
          {lead.notes ? <div className="sm:col-span-2 lg:col-span-3 rounded-xl bg-surface-2 p-4 text-sm leading-6 text-ink-muted">{lead.notes}</div> : null}
          {lead.lostReason ? <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-danger/25 bg-danger/10 p-4 text-sm text-danger"><b>Lost reason:</b> {lead.lostReason}</div> : null}
        </div> : <form onSubmit={saveEdit} className="grid gap-4 p-6 md:grid-cols-2">
          <label><span className={ui.label}>Customer name</span><input className={`${ui.input} mt-1`} value={edit.customerName} onChange={(e) => setEdit((v) => ({ ...v, customerName: e.target.value }))} required /></label>
          <label><span className={ui.label}>Phone</span><input className={`${ui.input} mt-1`} value={edit.customerPhone} onChange={(e) => setEdit((v) => ({ ...v, customerPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} required /></label>
          <label><span className={ui.label}>Email</span><input type="email" className={`${ui.input} mt-1`} value={edit.customerEmail} onChange={(e) => setEdit((v) => ({ ...v, customerEmail: e.target.value }))} /></label>
          <label><span className={ui.label}>City</span><input className={`${ui.input} mt-1`} value={edit.city} onChange={(e) => setEdit((v) => ({ ...v, city: e.target.value }))} /></label>
          <label className="md:col-span-2"><span className={ui.label}>Address</span><input className={`${ui.input} mt-1`} value={edit.address} onChange={(e) => setEdit((v) => ({ ...v, address: e.target.value }))} /></label>
          <label><span className={ui.label}>Service</span><select className={`${ui.input} mt-1`} value={edit.serviceType} onChange={(e) => setEdit((v) => ({ ...v, serviceType: e.target.value as ServiceType }))}>{Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span className={ui.label}>Priority</span><select className={`${ui.input} mt-1`} value={edit.priority} onChange={(e) => setEdit((v) => ({ ...v, priority: e.target.value as LeadPriority }))}>{Object.entries(LEAD_PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span className={ui.label}>Source</span><select className={`${ui.input} mt-1`} value={edit.source} onChange={(e) => setEdit((v) => ({ ...v, source: e.target.value as LeadSource }))}>{Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span className={ui.label}>Source detail</span><input className={`${ui.input} mt-1`} value={edit.sourceDetail} onChange={(e) => setEdit((v) => ({ ...v, sourceDetail: e.target.value }))} /></label>
          <label><span className={ui.label}>Assigned admin</span><select className={`${ui.input} mt-1`} value={edit.assignedTo} onChange={(e) => setEdit((v) => ({ ...v, assignedTo: e.target.value }))}>{assignees.length ? assignees.map((item) => <option key={item._id} value={item._id}>{item.name}</option>) : <option value={lead.assignedTo}>{lead.assignedToName ?? 'Admin'}</option>}</select></label>
          <label><span className={ui.label}>Follow-up</span><input type="datetime-local" className={`${ui.input} mt-1`} value={edit.followUpAt} onChange={(e) => setEdit((v) => ({ ...v, followUpAt: e.target.value }))} /></label>
          <label><span className={ui.label}>Site visit</span><input type="datetime-local" className={`${ui.input} mt-1`} value={edit.siteVisitAt} onChange={(e) => setEdit((v) => ({ ...v, siteVisitAt: e.target.value }))} /></label>
          <label className="md:col-span-2"><span className={ui.label}>Notes</span><textarea className={`${ui.input} mt-1 h-28 py-3`} value={edit.notes} onChange={(e) => setEdit((v) => ({ ...v, notes: e.target.value }))} /></label>
          <div className="md:col-span-2 flex justify-end"><button className={ui.btnPrimary} disabled={busy === 'edit'}>{busy === 'edit' ? 'Saving…' : 'Save changes'}</button></div>
        </form>}
      </section>

      <section className={`${ui.card} p-6`}>
        <div className="flex items-end justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Activity timeline</p><h2 className="mt-1 text-lg font-semibold">Sales history</h2></div><span className="text-xs text-ink-muted">{timeline.length} events</span></div>
        <form onSubmit={addActivity} className="mt-5 rounded-xl border border-border-default bg-surface-2 p-4"><div className="grid gap-3 md:grid-cols-[160px_1fr_220px]"><select className={ui.input} value={activityType} onChange={(e) => setActivityType(e.target.value as LeadActivityType)}><option value="note">Note</option><option value="call">Call</option><option value="follow_up">Follow-up</option><option value="site_visit">Site visit</option></select><input className={ui.input} value={activityNote} onChange={(e) => setActivityNote(e.target.value)} placeholder="What happened? Add useful context…" required /><input type="datetime-local" className={ui.input} value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} disabled={!['follow_up','site_visit'].includes(activityType)} /></div><div className="mt-3 flex justify-end"><button className={ui.btnPrimary} disabled={busy === 'activity'}>{busy === 'activity' ? 'Adding…' : '+ Add activity'}</button></div></form>
        <div className="mt-6 space-y-0">{timeline.length ? timeline.map((item, index) => <div className="relative grid grid-cols-[24px_1fr] gap-3 pb-6" key={item._id ?? `${item.createdAt}-${index}`}><div className="relative"><span className="absolute left-[7px] top-2 h-2.5 w-2.5 rounded-full bg-accent" />{index < timeline.length - 1 ? <span className="absolute left-[11px] top-5 h-[calc(100%+8px)] w-px bg-border-default" /> : null}</div><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-border-default bg-surface-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.13em] text-ink-muted">{activityLabel[item.type]}</span><span className="text-xs text-ink-faint">{fmt(item.createdAt)}</span></div><p className="mt-2 text-sm leading-6">{item.note}</p><p className="mt-1 text-xs text-ink-muted">{item.actorName ?? 'Admin'}{item.scheduledFor ? ` · Scheduled ${fmt(item.scheduledFor)}` : ''}</p></div></div>) : <p className="py-8 text-center text-sm text-ink-muted">No activity logged yet.</p>}</div>
      </section>
    </div>

    <aside className="space-y-5">
      <section className={`${ui.card} p-5`}><p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Pipeline actions</p><h2 className="mt-1 text-lg font-semibold">Move opportunity</h2><div className="mt-4 flex flex-wrap gap-2">{transitions[lead.status].map((status) => <button key={status} disabled={Boolean(busy)} onClick={() => changeStatus(status)} className={status === 'lost' ? `${ui.btnGhostSm} border-danger/30 text-danger` : status === 'won' ? `${ui.btnGhostSm} border-success/30 text-success` : ui.btnGhostSm}>{LEAD_STATUS_LABELS[status]}</button>)}{!transitions[lead.status].length ? <p className="text-sm text-ink-muted">This lead is closed.</p> : null}</div></section>

      <section className={`${ui.card} p-5`}><p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">Commercial next step</p><h2 className="mt-1 text-lg font-semibold">Quotation</h2>{lead.quotationId ? <><p className="mt-3 text-sm text-ink-muted">A quotation is already linked to this opportunity.</p><Link href={`/dashboard/quotations/${lead.quotationId}`} className={`${ui.btnPrimary} mt-4 w-full`}>Open quotation →</Link></> : ['won','lost'].includes(lead.status) ? <p className="mt-3 text-sm text-ink-muted">Reopen the lead before preparing a new quotation.</p> : <><p className="mt-3 text-sm leading-6 text-ink-muted">Customer, site and service details will be prefilled. Pricing stays editable.</p><Link href={`/dashboard/quotations/new?leadId=${lead._id}`} className={`${ui.btnPrimary} mt-4 w-full`}>Prepare quotation →</Link></>}</section>

      <section className={`${ui.card} p-5`}><p className="text-[10px] font-bold uppercase tracking-[.15em] text-ink-faint">Quick contact</p><a href={`tel:${lead.customerPhone}`} className={`${ui.btnGhost} mt-3 w-full`}>Call {lead.customerPhone}</a>{lead.customerEmail ? <a href={`mailto:${lead.customerEmail}`} className={`${ui.btnGhost} mt-2 w-full`}>Email customer</a> : null}</section>

      {!lead.quotationId && lead.status !== 'won' ? <section className="rounded-2xl border border-danger/20 bg-danger/5 p-5"><p className="text-xs font-bold uppercase tracking-[.15em] text-danger">Danger zone</p><p className="mt-2 text-xs leading-5 text-ink-muted">Only delete accidental/unneeded leads. Linked or won leads are protected by the backend.</p><button type="button" onClick={remove} disabled={busy === 'delete'} className="mt-4 text-xs font-semibold text-danger hover:underline">Delete lead</button></section> : null}
    </aside>
  </div>;
}
