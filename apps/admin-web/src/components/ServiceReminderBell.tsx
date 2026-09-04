"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ServiceReminder, ServiceReminderMetrics } from "@/types/serviceReminder";
import { SERVICE_TYPE_LABELS, ServiceType } from "@/types/project";

function date(value: string) { return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); }
function service(value: string) { return SERVICE_TYPE_LABELS[value as ServiceType] ?? value.replaceAll("_", " "); }

export function ServiceReminderBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ServiceReminder[]>([]);
  const [metrics, setMetrics] = useState<ServiceReminderMetrics>({ total: 0, unread: 0, overdue: 0, dueToday: 0, next7Days: 0 });
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const response = await fetch("/api/service-reminders?page=1&pageSize=10&sort=due_asc", { cache: "no-store" });
      const json = await response.json();
      if (response.ok && json.success) {
        setItems(json.data.reminders);
        setMetrics(json.data.metrics);
      }
    } catch {}
  }
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 60000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { const close = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);

  async function markAll() { await fetch("/api/service-reminders/read-all", { method: "PATCH" }); await load(); }
  const preview = items.slice(0, 5);

  return <div ref={ref} className="relative"><button type="button" aria-label="Service reminders" onClick={() => setOpen((value) => !value)} className="relative grid h-10 w-10 place-items-center rounded-xl border border-border-default bg-surface-2 text-ink-muted transition hover:border-border-strong hover:text-ink"><span aria-hidden="true" className="text-lg">♢</span>{metrics.unread > 0 ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-accent px-1.5 py-0.5 text-center text-[9px] font-black leading-4 text-accent-ink">{metrics.unread > 99 ? "99+" : metrics.unread}</span> : null}</button>
    {open ? <div className="absolute right-0 top-12 z-50 w-[min(92vw,390px)] overflow-hidden rounded-2xl border border-border-default bg-surface shadow-2xl shadow-black/35"><div className="flex items-center justify-between border-b border-border-default p-4"><div><p className="text-sm font-semibold">Service reminders</p><p className="mt-0.5 text-[11px] text-ink-faint">{metrics.dueToday} today · {metrics.overdue} overdue · {metrics.total} active</p></div>{metrics.unread ? <button onClick={markAll} className="text-xs font-semibold text-accent">Mark all read</button> : null}</div><div className="max-h-[360px] overflow-y-auto p-2">{preview.length ? preview.map((item) => <Link key={item.id} onClick={() => setOpen(false)} href="/dashboard/service-reminders" className="block rounded-xl px-3 py-3 transition hover:bg-surface-2"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.customerName}</p><p className="mt-1 truncate text-xs text-ink-muted">{service(item.serviceType)} · {date(item.dueDate)}</p></div><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.adminReadAt ? "bg-border-strong" : "bg-accent"}`} /></div></Link>) : <div className="px-4 py-8 text-center text-xs text-ink-muted">No active service reminders.</div>}</div><Link onClick={() => setOpen(false)} href="/dashboard/service-reminders" className="block border-t border-border-default px-4 py-3 text-center text-xs font-bold text-accent hover:bg-surface-2">Open reminder center</Link></div> : null}
  </div>;
}
