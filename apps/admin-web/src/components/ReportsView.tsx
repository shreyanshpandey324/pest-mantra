"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Project,
  ProjectStatus,
  SERVICE_TYPE_LABELS,
  STATUS_LABELS,
  TechnicianListItem,
} from "@/types/project";
import { MileageLogEntry } from "@/types/tracking";

const DAY = 86_400_000;
const CHART_GREEN = "#3ddc84";
const CHART_GREEN_SOFT = "#55e596";
const CHART_TEXT = "#9aa1ac";
const CHART_GRID = "#2a2f3a";
const STATUS_COLORS: Record<ProjectStatus, string> = {
  [ProjectStatus.NEW]: "#9aa1ac",
  [ProjectStatus.ASSIGNED]: "#ffc94d",
  [ProjectStatus.EN_ROUTE]: "#60a5fa",
  [ProjectStatus.IN_PROGRESS]: "#3ddc84",
  [ProjectStatus.COMPLETED]: "#55e596",
  [ProjectStatus.CANCELLED]: "#ff5c5c",
};

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function toDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function safeTime(value?: string) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatKm(value: number) {
  return `${value.toLocaleString("en-IN", { maximumFractionDigits: 1 })} km`;
}

function chartTooltipFormatter(value: unknown, name: unknown) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  return [Number.isFinite(numeric) ? numeric.toLocaleString("en-IN") : String(value ?? ""), String(name ?? "")];
}

const tooltipStyle = {
  background: "#171a21",
  border: "1px solid #2a2f3a",
  borderRadius: 12,
  color: "#f2f1ed",
  boxShadow: "0 12px 30px rgba(0,0,0,.35)",
};

export function ReportsView({
  projects,
  technicians,
  mileage,
  mileageError,
  techniciansError,
}: {
  projects: Project[];
  technicians: TechnicianListItem[];
  mileage: MileageLogEntry[];
  mileageError?: string | null;
  techniciansError?: string | null;
}) {
  const newestTimestamp = useMemo(() => {
    const values = [
      ...projects.map((project) => safeTime(project.createdAt)),
      ...mileage.map((entry) => safeTime(entry.dutyStartAt)),
    ].filter((value) => value > 0);

    return values.length > 0 ? Math.max(...values) : Date.now();
  }, [projects, mileage]);

  const [from, setFrom] = useState(() => toDateInput(new Date(newestTimestamp - 29 * DAY)));
  const [to, setTo] = useState(() => toDateInput(new Date(newestTimestamp)));

  const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const toTime = to ? new Date(`${to}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;

  const filteredProjects = useMemo(
    () => projects.filter((project) => {
      const created = safeTime(project.createdAt);
      return created >= fromTime && created <= toTime;
    }),
    [projects, fromTime, toTime]
  );

  const filteredMileage = useMemo(
    () => mileage.filter((entry) => {
      const started = safeTime(entry.dutyStartAt);
      return started >= fromTime && started <= toTime;
    }),
    [mileage, fromTime, toTime]
  );

  const completed = filteredProjects.filter((project) => project.status === ProjectStatus.COMPLETED).length;
  const activeWork = filteredProjects.filter((project) =>
    [ProjectStatus.ASSIGNED, ProjectStatus.EN_ROUTE, ProjectStatus.IN_PROGRESS].includes(project.status)
  ).length;
  const totalMileage = filteredMileage.reduce((sum, entry) => sum + (entry.distanceKm ?? 0), 0);
  const closedMileageLogs = filteredMileage.filter((entry) => typeof entry.distanceKm === "number").length;
  const assignedTechIds = new Set(
    filteredProjects.map((project) => project.assignedTechnicianId?._id).filter((id): id is string => Boolean(id))
  );

  const statusData = Object.values(ProjectStatus).map((status) => ({
    name: STATUS_LABELS[status],
    status,
    value: filteredProjects.filter((project) => project.status === status).length,
  }));

  const serviceData = Object.entries(SERVICE_TYPE_LABELS)
    .map(([service, name]) => ({
      name,
      jobs: filteredProjects.filter((project) => project.serviceType === service).length,
    }))
    .filter((row) => row.jobs > 0)
    .sort((a, b) => b.jobs - a.jobs);

  const dailyTrend = useMemo(() => {
    const rows = new Map<string, { date: string; jobs: number; completed: number }>();
    for (const project of filteredProjects) {
      const key = project.createdAt.slice(0, 10);
      const existing = rows.get(key) ?? { date: key, jobs: 0, completed: 0 };
      existing.jobs += 1;
      if (project.status === ProjectStatus.COMPLETED) existing.completed += 1;
      rows.set(key, existing);
    }
    return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredProjects]);

  const mileageByTechnician = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of filteredMileage) {
      map.set(entry.technicianId, (map.get(entry.technicianId) ?? 0) + (entry.distanceKm ?? 0));
    }
    return map;
  }, [filteredMileage]);

  const technicianRows = useMemo(
    () => technicians
      .map((technician) => {
        const jobs = filteredProjects.filter((project) => project.assignedTechnicianId?._id === technician.id);
        const done = jobs.filter((project) => project.status === ProjectStatus.COMPLETED).length;
        return {
          ...technician,
          jobs: jobs.length,
          done,
          rate: pct(done, jobs.length),
          distanceKm: mileageByTechnician.get(technician.id) ?? 0,
        };
      })
      .filter((row) => row.jobs > 0 || row.distanceKm > 0)
      .sort((a, b) => b.done - a.done || b.jobs - a.jobs || b.distanceKm - a.distanceKm),
    [technicians, filteredProjects, mileageByTechnician]
  );

  const mileageDaily = useMemo(() => {
    const rows = new Map<string, number>();
    for (const entry of filteredMileage) {
      const key = entry.dutyStartAt.slice(0, 10);
      rows.set(key, (rows.get(key) ?? 0) + (entry.distanceKm ?? 0));
    }
    return [...rows.entries()]
      .map(([date, distance]) => ({ date, distance: Number(distance.toFixed(1)) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredMileage]);

  const invalidRange = Boolean(from && to && fromTime > toTime);

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_14px_rgba(61,220,132,.75)]" />
            <p className="font-mono text-xs uppercase tracking-[.2em] text-success">Operations intelligence</p>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Reports & Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Live project, technician and mileage analytics sourced from operational data.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-border-default bg-surface p-3 shadow-lg shadow-black/10">
          <label className="text-xs text-ink-muted">
            From
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="mt-1 block rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-success"
            />
          </label>
          <label className="text-xs text-ink-muted">
            To
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="mt-1 block rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-success"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="h-10 rounded-lg border border-border-default px-4 text-sm text-ink-muted transition hover:border-success/50 hover:text-success"
          >
            All time
          </button>
        </div>
      </header>

      {invalidRange ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          The From date must be earlier than or equal to the To date.
        </div>
      ) : null}

      {techniciansError ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          Technician analytics are limited: {techniciansError}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total jobs", filteredProjects.length, "Created in selected period", "↗"],
          ["Completion", `${pct(completed, filteredProjects.length)}%`, `${completed} completed jobs`, "✓"],
          ["Active work", activeWork, `${assignedTechIds.size} technicians assigned`, "◉"],
          ["Field mileage", formatKm(totalMileage), `${closedMileageLogs} measured duty logs`, "⌁"],
        ].map(([label, value, sub, icon]) => (
          <div
            key={String(label)}
            className="group relative overflow-hidden rounded-2xl border border-border-default bg-surface p-5 transition hover:-translate-y-0.5 hover:border-success/40"
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-success/5 blur-2xl transition group-hover:bg-success/10" />
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-ink-muted">{label}</p>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-success/15 bg-success/10 text-success">
                {icon}
              </span>
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-ink-faint">{sub}</p>
          </div>
        ))}
      </section>

      {filteredProjects.length === 0 && filteredMileage.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong bg-surface p-12 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-success/10 text-success">⌁</div>
          <h2 className="text-lg">No report data in this date range</h2>
          <p className="mt-1 text-sm text-ink-muted">Choose a wider range or switch to all-time.</p>
        </div>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
            <ChartCard title="Work volume trend" subtitle="Jobs created vs jobs currently completed, grouped by creation date">
              {dailyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={dailyTrend} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: CHART_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fill: CHART_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(label: unknown) => shortDate(String(label))} formatter={chartTooltipFormatter} />
                    <Line type="monotone" dataKey="jobs" name="Jobs" stroke={CHART_GREEN} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="completed" name="Completed" stroke={CHART_GREEN_SOFT} strokeWidth={2} strokeDasharray="5 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty text="No project activity to chart in this range." />
              )}
            </ChartCard>

            <ChartCard title="Job status" subtitle="Current workflow distribution of selected jobs">
              {filteredProjects.length > 0 ? (
                <div className="grid items-center gap-3 sm:grid-cols-[1fr_160px] xl:grid-cols-1 2xl:grid-cols-[1fr_150px]">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Tooltip contentStyle={tooltipStyle} formatter={chartTooltipFormatter} />
                      <Pie data={statusData.filter((row) => row.value > 0)} dataKey="value" nameKey="name" innerRadius={62} outerRadius={94} paddingAngle={3} stroke="none">
                        {statusData.filter((row) => row.value > 0).map((row) => (
                          <Cell key={row.status} fill={STATUS_COLORS[row.status]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {statusData.map((row) => (
                      <div key={row.status} className="flex items-center justify-between gap-3 text-xs">
                        <span className="flex items-center gap-2 text-ink-muted">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[row.status] }} />
                          {row.name}
                        </span>
                        <span className="font-mono text-ink">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <ChartEmpty text="No jobs to break down by status." />
              )}
            </ChartCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Service demand" subtitle="Real jobs grouped by pest-control service type">
              {serviceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={serviceData} margin={{ top: 10, right: 8, left: -18, bottom: 12 }}>
                    <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: CHART_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={58} />
                    <YAxis allowDecimals={false} tick={{ fill: CHART_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={chartTooltipFormatter} />
                    <Bar dataKey="jobs" name="Jobs" fill={CHART_GREEN} radius={[8, 8, 0, 0]} maxBarSize={46} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty text="No service-type activity in this range." />
              )}
            </ChartCard>

            <ChartCard title="Mileage / field summary" subtitle={mileageError ? "Mileage endpoint could not be loaded" : "Measured duty distance from the mileage report endpoint"}>
              {mileageError ? (
                <div className="rounded-xl border border-warning/25 bg-warning/10 p-4 text-sm text-warning">{mileageError}</div>
              ) : mileageDaily.length > 0 ? (
                <>
                  <div className="mb-4 grid grid-cols-3 gap-2">
                    <MiniStat label="Distance" value={formatKm(totalMileage)} />
                    <MiniStat label="Duty logs" value={String(filteredMileage.length)} />
                    <MiniStat label="Avg / measured log" value={formatKm(closedMileageLogs ? totalMileage / closedMileageLogs : 0)} />
                  </div>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={mileageDaily} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: CHART_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
                      <YAxis tick={{ fill: CHART_TEXT, fontSize: 11 }} axisLine={false} tickLine={false} unit=" km" width={54} />
                      <Tooltip contentStyle={tooltipStyle} labelFormatter={(label: unknown) => shortDate(String(label))} formatter={(value: unknown) => [`${Number(value ?? 0).toFixed(1)} km`, "Distance"]} />
                      <Bar dataKey="distance" name="Distance" fill={CHART_GREEN_SOFT} radius={[7, 7, 0, 0]} maxBarSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <ChartEmpty text="No measured mileage logs in this range." />
              )}
            </ChartCard>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border-default bg-surface">
            <div className="flex flex-col gap-2 border-b border-border-default p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg">Technician performance</h2>
                <p className="text-xs text-ink-muted">Job completion and measured field distance for technicians with activity in the selected period.</p>
              </div>
              <span className="text-xs text-ink-faint">{technicianRows.length} technicians with activity</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-surface-2/60 text-xs uppercase tracking-wider text-ink-faint">
                  <tr>
                    <th className="px-5 py-3 font-medium">Technician</th>
                    <th className="px-5 py-3 font-medium">Assigned jobs</th>
                    <th className="px-5 py-3 font-medium">Completed</th>
                    <th className="px-5 py-3 font-medium">Completion</th>
                    <th className="px-5 py-3 font-medium">Mileage</th>
                    <th className="px-5 py-3 font-medium">Duty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {technicianRows.length > 0 ? technicianRows.map((row) => (
                    <tr key={row.id} className="transition hover:bg-surface-2/35">
                      <td className="px-5 py-4">
                        <p className="font-medium">{row.name}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">{row.employeeCode}</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-ink-muted">{row.jobs}</td>
                      <td className="px-5 py-4 font-mono text-success">{row.done}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
                            <div className="h-full rounded-full bg-success" style={{ width: `${row.rate}%` }} />
                          </div>
                          <span className="font-mono text-xs text-ink-muted">{row.rate}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-ink-muted">{formatKm(row.distanceKm)}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full border border-border-default px-2.5 py-1 text-xs capitalize text-ink-muted">
                          {row.dutyStatus.replaceAll("_", " ")}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-ink-muted">No technician activity in this range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border-default bg-surface p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg">{title}</h2>
          <p className="mt-1 text-xs text-ink-muted">{subtitle}</p>
        </div>
        <span className="shrink-0 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">Live data</span>
      </div>
      {children}
    </section>
  );
}

function ChartEmpty({ text }: { text: string }) {
  return <div className="grid min-h-[220px] place-items-center rounded-xl border border-dashed border-border-default bg-surface-2/30 px-6 text-center text-sm text-ink-muted">{text}</div>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-default bg-surface-2/45 p-3">
      <p className="text-[11px] text-ink-faint">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
