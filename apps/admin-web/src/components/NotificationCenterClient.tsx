"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NotificationAlert, NotificationAlertKind, NOTIFICATION_KIND_LABELS } from "@/types/notification-alert";

const kinds: NotificationAlertKind[] = ["service_due", "invoice_overdue", "amc_renewal", "lead_follow_up", "complaint_sla", "system"];

type Capability = { provider?: string; configured?: boolean; note?: string };

export function NotificationCenterClient({ initial, initialUnread }: { initial: NotificationAlert[]; initialUnread: number }) {
  const [items, setItems] = useState(initial);
  const [unread, setUnread] = useState(initialUnread);
  const [kind, setKind] = useState<"all" | NotificationAlertKind>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [capability, setCapability] = useState<Capability>({});
  const visible = useMemo(() => kind === "all" ? items : items.filter((x) => x.kind === kind), [items, kind]);

  useEffect(() => { void fetch("/api/communications/status", { cache: "no-store" }).then((r) => r.json()).then((j) => { if (j.success) setCapability(j.data ?? {}); }).catch(() => undefined); }, []);

  const reload = async () => { const r = await fetch("/api/notification-center?pageSize=100", { cache: "no-store" }); const j = await r.json(); if (!r.ok) throw new Error(j.message || "Could not load alerts"); setItems(j.data.alerts); setUnread(j.data.unread); };
  const sweep = async () => { setLoading(true); setError(""); try { const r = await fetch("/api/notification-center/sweep", { method: "POST" }); const j = await r.json(); if (!r.ok) throw new Error(j.message || "Sweep failed"); await reload(); } catch (e) { setError(e instanceof Error ? e.message : "Sweep failed"); } finally { setLoading(false); } };
  const read = async (id: string) => { await fetch(`/api/notification-center/${id}/read`, { method: "POST" }); setItems((x) => x.map((a) => a._id === id ? { ...a, readAt: new Date().toISOString() } : a)); setUnread((x) => Math.max(0, x - 1)); };
  const readAll = async () => { await fetch("/api/notification-center/read-all", { method: "POST" }); const now = new Date().toISOString(); setItems((x) => x.map((a) => ({ ...a, readAt: a.readAt || now }))); setUnread(0); };
  const queue = async (id: string, channel: "whatsapp" | "sms") => {
    setNotice(""); setError("");
    try { const r = await fetch(`/api/communications/from-alert/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ channel }) }); const j = await r.json(); if (!r.ok || !j.success) throw new Error(j.message || "Could not queue delivery"); setNotice(capability.configured ? `${channel === "whatsapp" ? "WhatsApp" : "SMS"} delivery sent/queued through the configured provider.` : `${channel === "whatsapp" ? "WhatsApp" : "SMS"} added to the provider-ready outbox. Live delivery activates after webhook configuration.`); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not queue delivery"); }
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-accent">Automation inbox</p><h1 className="mt-1 text-3xl font-semibold">Notification Center</h1><p className="mt-2 text-sm text-ink-muted">Background engine watches service due dates, unpaid invoices, AMC renewals, CRM follow-ups and complaint SLA breaches.</p></div><div className="flex gap-2"><button onClick={() => void readAll()} disabled={!unread} className="rounded-xl border border-border-default px-3 py-2 text-sm disabled:opacity-40">Mark all read</button><button onClick={() => void sweep()} disabled={loading} className="rounded-xl bg-success px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50">{loading ? "Checking…" : "Run check now"}</button></div></div>

    <div className={`rounded-2xl border p-4 ${capability.configured ? "border-success/30 bg-success/5" : "border-accent/25 bg-accent/5"}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Outbound Automation</p><p className="mt-1 text-sm text-ink">WhatsApp / SMS provider outbox</p><p className="mt-1 text-xs text-ink-muted">{capability.note ?? "Checking provider capability…"}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${capability.configured ? "border-success/30 text-success" : "border-warning/30 text-warning"}`}>{capability.configured ? "Live provider connected" : "Provider-ready"}</span></div></div>

    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-border-default bg-surface p-4"><p className="text-xs uppercase tracking-wider text-ink-faint">Unread</p><p className="mt-2 text-2xl font-semibold">{unread}</p></div><div className="rounded-2xl border border-border-default bg-surface p-4"><p className="text-xs uppercase tracking-wider text-ink-faint">Critical</p><p className="mt-2 text-2xl font-semibold text-danger">{items.filter((x) => x.severity === "critical" && !x.readAt).length}</p></div><div className="rounded-2xl border border-border-default bg-surface p-4"><p className="text-xs uppercase tracking-wider text-ink-faint">Total alerts</p><p className="mt-2 text-2xl font-semibold">{items.length}</p></div></div>
    <div className="flex flex-wrap gap-2"><button onClick={() => setKind("all")} className={`rounded-full border px-3 py-1.5 text-xs ${kind === "all" ? "border-success/40 bg-success/10 text-success" : "border-border-default text-ink-muted"}`}>All</button>{kinds.map((k) => <button key={k} onClick={() => setKind(k)} className={`rounded-full border px-3 py-1.5 text-xs ${kind === k ? "border-success/40 bg-success/10 text-success" : "border-border-default text-ink-muted"}`}>{NOTIFICATION_KIND_LABELS[k]}</button>)}</div>
    {notice && <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">{notice}</div>}{error && <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</div>}
    {visible.length === 0 ? <div className="rounded-2xl border border-dashed border-border-default p-10 text-center text-sm text-ink-muted">No operational alerts in this view.</div> : <div className="space-y-2">{visible.map((a) => <div key={a._id} className={`rounded-2xl border p-4 ${a.readAt ? "border-border-default bg-surface" : "border-accent/40 bg-surface-2"}`}><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${a.severity === "critical" ? "border-danger/30 bg-danger/10 text-danger" : a.severity === "warning" ? "border-warning/30 bg-warning/10 text-warning" : "border-border-default text-ink-muted"}`}>{a.severity}</span><span className="text-xs text-ink-faint">{NOTIFICATION_KIND_LABELS[a.kind]}</span></div><h3 className="mt-2 font-semibold">{a.title}</h3><p className="mt-1 text-sm text-ink-muted">{a.message}</p><p className="mt-2 text-xs text-ink-faint">{new Date(a.createdAt).toLocaleString("en-IN")}</p></div><div className="flex shrink-0 flex-col gap-2">{a.href && <Link href={a.href} onClick={() => void read(a._id)} className="rounded-lg border border-border-default px-3 py-1.5 text-xs text-success">Open</Link>}{a.customerPhone ? <><button onClick={() => void queue(a._id, "whatsapp")} className="rounded-lg border border-border-default px-3 py-1.5 text-xs text-ink-muted">WhatsApp</button><button onClick={() => void queue(a._id, "sms")} className="rounded-lg border border-border-default px-3 py-1.5 text-xs text-ink-muted">SMS</button></> : null}{!a.readAt && <button onClick={() => void read(a._id)} className="rounded-lg border border-border-default px-3 py-1.5 text-xs">Read</button>}</div></div></div>)}</div>}
  </div>;
}
