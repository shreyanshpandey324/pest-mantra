"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Project, ProjectPriority, ProjectStatus, SERVICE_TYPE_LABELS } from "@/types/project";
import { ui } from "@/lib/ui-classes";

function keyOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function projectKey(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : keyOf(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())));
}

function startOfMonth(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1, 12));
}

function addMonths(value: Date, amount: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + amount, 1, 12));
}

export function ServiceCalendar({ projects, onDaySelect }: { projects: Project[]; onDaySelect?: (key: string) => void }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const today = keyOf(new Date());

  const cells = useMemo(() => {
    const first = startOfMonth(month);
    const firstDay = first.getUTCDay();
    const gridStart = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1 - firstDay, 12));
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart.getTime() + index * 86400000);
      const key = keyOf(date);
      const jobs = projects
        .filter((project) => projectKey(project.scheduledDate) === key && project.status !== ProjectStatus.CANCELLED)
        .sort((a, b) => (a.scheduledTimeSlot ?? "99").localeCompare(b.scheduledTimeSlot ?? "99"));
      return { date, key, jobs, inMonth: date.getUTCMonth() === first.getUTCMonth() };
    });
  }, [month, projects]);

  const monthJobs = cells.filter((cell) => cell.inMonth).reduce((sum, cell) => sum + cell.jobs.length, 0);
  const urgent = cells.flatMap((cell) => cell.jobs).filter((project) => project.priority === ProjectPriority.URGENT).length;

  return (
    <section className={`${ui.card} overflow-hidden`} aria-label="Monthly service calendar">
      <div className="flex flex-col gap-3 border-b border-border-default bg-surface-2/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Service Calendar</p>
          <h2 className="mt-1 text-lg font-semibold">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}</h2>
          <p className="mt-1 text-xs text-ink-faint">{monthJobs} scheduled services · {urgent} urgent. Click a date to focus the project list.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className={ui.btnGhostSm} onClick={() => setMonth((value) => addMonths(value, -1))}>← Previous</button>
          <button type="button" className={ui.btnGhostSm} onClick={() => setMonth(startOfMonth(new Date()))}>Today</button>
          <button type="button" className={ui.btnGhostSm} onClick={() => setMonth((value) => addMonths(value, 1))}>Next →</button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border-default bg-surface-2/30 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <div key={day} className="p-2">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell) => (
          <div key={cell.key} className={`min-h-[112px] border-b border-r border-border-default p-1.5 sm:min-h-[132px] sm:p-2 ${cell.inMonth ? "bg-surface" : "bg-surface-2/35 opacity-55"}`}>
            <button type="button" onClick={() => onDaySelect?.(cell.key)} className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${cell.key === today ? "bg-accent text-accent-ink" : "text-ink-muted hover:bg-surface-2"}`}>
              {cell.date.getUTCDate()}
            </button>
            <div className="mt-1 space-y-1">
              {cell.jobs.slice(0, 3).map((project) => (
                <Link key={project._id} href={`/dashboard/projects/${project._id}`} className={`block truncate rounded-md border px-1.5 py-1 text-[9px] leading-3 transition hover:border-accent/50 ${project.priority === ProjectPriority.URGENT ? "border-danger/35 bg-danger/5 text-danger" : project.status === ProjectStatus.COMPLETED ? "border-success/25 bg-success/5 text-success" : "border-border-default bg-surface-2/70 text-ink-muted"}`} title={`${project.customerName} · ${SERVICE_TYPE_LABELS[project.serviceType]}`}>
                  {project.scheduledTimeSlot ? `${project.scheduledTimeSlot} · ` : ""}{project.customerName}
                </Link>
              ))}
              {cell.jobs.length > 3 ? <button type="button" onClick={() => onDaySelect?.(cell.key)} className="text-[9px] font-semibold text-accent">+{cell.jobs.length - 3} more</button> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
