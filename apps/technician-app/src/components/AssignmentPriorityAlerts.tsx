"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import type { Job } from "@/types/job";

type AlertPriority = "normal" | "high" | "urgent";

type Policy = {
  label: string;
  reminderMs: number | null;
  maxNotifications: number;
  container: string;
  badge: string;
  message: string;
};

const POLICIES: Record<AlertPriority, Policy> = {
  normal: {
    label: "Normal",
    reminderMs: null,
    maxNotifications: 1,
    container: "border-accent/25 bg-accent/5",
    badge: "border-accent/30 bg-accent/10 text-accent",
    message: "New assignment. Please acknowledge when seen.",
  },
  high: {
    label: "Medium",
    reminderMs: 15 * 60 * 1000,
    maxNotifications: 3,
    container: "border-warning/35 bg-warning/5",
    badge: "border-warning/35 bg-warning/10 text-warning",
    message: "Important assignment. Reminder repeats every 15 minutes until acknowledged.",
  },
  urgent: {
    label: "High",
    reminderMs: 5 * 60 * 1000,
    maxNotifications: 6,
    container: "border-danger/40 bg-danger/5 shadow-[0_0_0_1px_rgba(239,68,68,0.05),0_12px_35px_rgba(239,68,68,0.08)]",
    badge: "border-danger/40 bg-danger/10 text-danger",
    message: "High-priority assignment. Reminder repeats every 5 minutes until acknowledged.",
  },
};

function priorityOf(job: Job): AlertPriority {
  return job.priority === "urgent" ? "urgent" : job.priority === "high" ? "high" : "normal";
}

function rank(priority: AlertPriority): number {
  return priority === "urgent" ? 0 : priority === "high" ? 1 : 2;
}

function storageKey(jobId: string): string {
  return `pmt_assignment_alert_${jobId}`;
}

type StoredAlertState = { count: number; lastAt: number };

function readState(jobId: string): StoredAlertState {
  try {
    const raw = localStorage.getItem(storageKey(jobId));
    if (!raw) return { count: 0, lastAt: 0 };
    const parsed = JSON.parse(raw) as Partial<StoredAlertState>;
    return { count: Number(parsed.count) || 0, lastAt: Number(parsed.lastAt) || 0 };
  } catch {
    return { count: 0, lastAt: 0 };
  }
}

function writeState(jobId: string, state: StoredAlertState): void {
  try {
    localStorage.setItem(storageKey(jobId), JSON.stringify(state));
  } catch {
    // Local storage can be blocked; the visible in-app alert still works.
  }
}

export function AssignmentPriorityAlerts({ jobs }: { jobs: Job[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(() => jobs.filter((job) => !job.assignmentAcknowledgedAt));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    setPending(jobs.filter((job) => !job.assignmentAcknowledgedAt));
  }, [jobs]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const sorted = useMemo(
    () => [...pending].sort((a, b) => rank(priorityOf(a)) - rank(priorityOf(b)) || new Date(a.assignedAt ?? a.createdAt).getTime() - new Date(b.assignedAt ?? b.createdAt).getTime()),
    [pending],
  );

  useEffect(() => {
    if (permission !== "granted" || sorted.length === 0) return;

    const maybeNotify = () => {
      const now = Date.now();
      for (const job of sorted) {
        const priority = priorityOf(job);
        const policy = POLICIES[priority];
        const state = readState(job._id);
        if (state.count >= policy.maxNotifications) continue;

        const due = state.count === 0 || (policy.reminderMs !== null && now - state.lastAt >= policy.reminderMs);
        if (!due) continue;

        new Notification(`${policy.label} assignment · ${job.projectCode}`, {
          body: `${job.customerName} · ${job.scheduledTimeSlot ?? "Open job"}. Open Pest Mantra and acknowledge.`,
          tag: `assignment-${job._id}-${state.count + 1}`,
          requireInteraction: priority === "urgent",
        });
        writeState(job._id, { count: state.count + 1, lastAt: now });
      }
    };

    maybeNotify();
    const timer = window.setInterval(maybeNotify, 30_000);
    return () => window.clearInterval(timer);
  }, [permission, sorted]);

  async function enableBrowserAlerts() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  async function acknowledge(jobId: string) {
    setBusyId(jobId);
    setError("");
    try {
      const response = await fetch(`/api/jobs/${jobId}/acknowledge-assignment`, { method: "PATCH" });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || "Could not acknowledge assignment");
      setPending((items) => items.filter((job) => job._id !== jobId));
      try { localStorage.removeItem(storageKey(jobId)); } catch {}
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not acknowledge assignment");
    } finally {
      setBusyId(null);
    }
  }

  if (sorted.length === 0) return null;

  const lead = sorted[0];
  const priority = priorityOf(lead);
  const policy = POLICIES[priority];

  return (
    <section className={`relative overflow-hidden rounded-2xl border p-4 ${policy.container} ${priority === "urgent" ? "animate-[priorityPulse_2.2s_ease-in-out_infinite]" : ""}`} aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${policy.badge}`}>{policy.label} alert</span>
            {sorted.length > 1 ? <span className="text-[10px] font-medium text-ink-faint">+{sorted.length - 1} more unacknowledged</span> : null}
          </div>
          <h2 className="mt-2 text-base font-semibold text-ink">Acknowledge {lead.projectCode} · {lead.customerName}</h2>
          <p className="mt-1 text-xs leading-5 text-ink-muted">{policy.message}</p>
          <p className="mt-1 text-[11px] text-ink-faint">{lead.scheduledTimeSlot ?? "No time slot"} · {lead.address}</p>
        </div>
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${priority === "urgent" ? "bg-danger" : priority === "high" ? "bg-warning" : "bg-accent"}`} />
      </div>

      {error ? <p className="mt-3 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-xs text-danger">{error}</p> : null}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
        <button type="button" onClick={() => void acknowledge(lead._id)} disabled={busyId === lead._id} className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-60">
          {busyId === lead._id ? "Acknowledging…" : "✓ Acknowledge"}
        </button>
        <Link href={`/jobs/${lead._id}`} className="inline-flex h-11 items-center justify-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-ink">Open job</Link>
        {permission === "default" ? (
          <button type="button" onClick={() => void enableBrowserAlerts()} className="col-span-2 inline-flex h-10 items-center justify-center rounded-xl border border-border-default px-3 text-xs font-semibold text-ink-muted sm:h-11">Enable browser alerts</button>
        ) : null}
      </div>

      {permission === "denied" ? <p className="mt-2 text-[10px] text-ink-faint">Browser notifications are blocked. The in-app alert remains active until acknowledgement.</p> : null}
    </section>
  );
}
