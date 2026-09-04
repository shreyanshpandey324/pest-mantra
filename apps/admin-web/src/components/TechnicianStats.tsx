"use client";

import { TechnicianListItem } from "@/types/project";
import { ui } from "@/lib/ui-classes";

export function TechnicianStats({ technicians }: { technicians: TechnicianListItem[] }) {
  const total = technicians.length;
  const available = technicians.filter((t) => t.dutyStatus === "on_duty_idle").length;
  const offDuty = technicians.filter((t) => t.dutyStatus === "off_duty").length;
  const inTransit = technicians.filter((t) => t.dutyStatus === "en_route").length;
  const busy = technicians.filter((t) => t.dutyStatus === "busy" || t.dutyStatus === "on_site").length;
  const active = technicians.filter((t) => t.isActive).length;
  const jobsAssigned = technicians.reduce((sum, t) => sum + (t.performance?.todayAssignedJobs ?? 0), 0);
  const completedJobs = technicians.reduce((sum, t) => sum + (t.performance?.completedToday ?? 0), 0);
  const distanceCovered = technicians.reduce((sum, t) => sum + (t.performance?.distanceTodayKm ?? 0), 0);
  const rated = technicians.map((t) => t.performance?.averageRating).filter((v): v is number => typeof v === "number");
  const averageRating = rated.length ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1) : "—";
  const attendance = total > 0 ? Math.round((active / total) * 100) : 0;

  return (
    <div className="mb-6 grid gap-4 xl:grid-cols-[1.05fr_1.45fr]">
      <div className={`${ui.card} p-5`}>
        <div className="mb-5"><h2 className="text-sm font-semibold text-ink">Team Availability</h2><p className="mt-1 text-[11px] text-ink-faint">Live duty state from field profiles</p></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Mini label="Available" value={available} tone="text-success" />
          <Mini label="En route" value={inTransit} tone="text-accent" />
          <Mini label="Busy / on site" value={busy} tone="text-warning" />
          <Mini label="Off duty" value={offDuty} tone="text-ink-muted" />
        </div>
      </div>
      <div className={`${ui.card} p-5`}>
        <div className="mb-5"><h2 className="text-sm font-semibold text-ink">Today&apos;s Real Performance</h2><p className="mt-1 text-[11px] text-ink-faint">Aggregated from jobs, feedback and duty mileage — no placeholder metrics.</p></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Summary label="Jobs assigned" value={jobsAssigned} />
          <Summary label="Completed" value={completedJobs} />
          <Summary label="Distance" value={`${distanceCovered.toFixed(1)} km`} />
          <Summary label="Team rating" value={averageRating === "—" ? "—" : `${averageRating}/5`} />
          <Summary label="Attendance" value={`${attendance}%`} />
          <Summary label="Active staff" value={`${active}/${total}`} />
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className="rounded-xl border border-border-default bg-surface-2/50 p-3"><p className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</p><p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p></div>; }
function Summary({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border border-border-default bg-surface-2/50 p-3"><p className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</p><p className="mt-2 text-lg font-semibold text-ink">{value}</p></div>; }
