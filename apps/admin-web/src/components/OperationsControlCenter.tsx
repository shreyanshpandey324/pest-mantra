"use client";

import Link from "next/link";
import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  MouseEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ui } from "@/lib/ui-classes";
import {
  Project,
  ProjectStatus,
  ProjectPriority,
  PRIORITY_LABELS,
  SERVICE_TYPE_LABELS,
  STATUS_LABELS,
  TechnicianListItem,
} from "@/types/project";

interface OperationsControlCenterProps {
  initialProjects: Project[];
  initialTechnicians: TechnicianListItem[];
  loadError?: string | null;
}

type Toast = {
  kind: "success" | "error";
  text: string;
} | null;

const TIME_SLOTS = [
  "09:00 AM - 11:00 AM",
  "11:00 AM - 01:00 PM",
  "01:00 PM - 03:00 PM",
  "03:00 PM - 05:00 PM",
  "05:00 PM - 07:00 PM",
  "07:00 PM - 09:00 PM",
];

const DUTY_LABELS: Record<TechnicianListItem["dutyStatus"], string> = {
  off_duty: "Off Duty",
  on_duty_idle: "Available",
  en_route: "En Route",
  on_site: "On Site",
  busy: "Busy",
};

const DUTY_STYLES: Record<TechnicianListItem["dutyStatus"], string> = {
  off_duty: "border-border-strong text-ink-faint",
  on_duty_idle: "border-success/40 text-success",
  en_route: "border-accent/40 text-accent",
  on_site: "border-accent/40 text-accent",
  busy: "border-warning/40 text-warning",
};

const STATUS_STYLES: Record<ProjectStatus, string> = {
  [ProjectStatus.NEW]: "border-border-strong text-ink-muted",
  [ProjectStatus.ASSIGNED]: "border-warning/40 text-warning",
  [ProjectStatus.EN_ROUTE]: "border-accent/40 text-accent",
  [ProjectStatus.IN_PROGRESS]: "border-accent/40 text-accent",
  [ProjectStatus.COMPLETED]: "border-success/40 text-success",
  [ProjectStatus.CANCELLED]: "border-danger/40 text-danger",
};

function getIndiaDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getProjectDateKey(project: Project): string | null {
  if (!project.scheduledDate) return null;
  const parsed = new Date(project.scheduledDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return getIndiaDateKey(parsed);
}

function offsetDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days, 6));
  return value.toISOString().slice(0, 10);
}

function formatDisplayDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 6));
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function sortJobs(a: Project, b: Project): number {
  const slotA = a.scheduledTimeSlot ?? "99";
  const slotB = b.scheduledTimeSlot ?? "99";
  return slotA.localeCompare(slotB) || a.projectCode.localeCompare(b.projectCode);
}

interface DispatchRecommendation {
  technician: TechnicianListItem;
  score: number;
  reasons: string[];
  workload: number;
  distanceKm?: number;
  etaMinutes?: number;
}

function toRadians(value: number): number { return (value * Math.PI) / 180; }
function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const earthKm = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(h));
}
function routeEstimate(km: number): { roadKm: number; etaMinutes: number } {
  const roadKm = km * 1.22;
  return { roadKm, etaMinutes: Math.max(4, Math.round((roadKm / 24) * 60)) };
}

function normalizeSkill(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function dispatchRecommendation(
  technician: TechnicianListItem,
  project: Project,
  workload: number
): DispatchRecommendation {
  if (!technician.isActive || technician.dutyStatus === "off_duty") {
    return { technician, score: 0, reasons: ["Off duty"], workload };
  }

  let score = 42;
  const reasons: string[] = [];

  if (technician.dutyStatus === "on_duty_idle") {
    score += 28;
    reasons.push("Available now");
  } else if (technician.dutyStatus === "en_route") {
    score += 8;
    reasons.push("Already in field");
  } else if (technician.dutyStatus === "on_site") {
    score -= 4;
    reasons.push("Currently on site");
  } else if (technician.dutyStatus === "busy") {
    score -= 12;
    reasons.push("Busy workload");
  }

  const projectSkill = normalizeSkill(project.serviceType);
  const skills = technician.skills.map(normalizeSkill);
  const skillMatch = skills.some((skill) => skill === projectSkill || skill.includes(projectSkill) || projectSkill.includes(skill));
  if (skillMatch) {
    score += 28;
    reasons.push(`${SERVICE_TYPE_LABELS[project.serviceType]} skilled`);
  } else if (technician.skills.length) {
    score += 4;
    reasons.push("General field skills");
  }

  if (project.branchId && technician.branchId && project.branchId === technician.branchId) {
    score += 8;
    reasons.push("Same branch");
  }

  if (workload === 0) {
    score += 18;
    reasons.push("No jobs scheduled");
  } else if (workload === 1) {
    score += 12;
    reasons.push("Light workload");
  } else if (workload === 2) {
    score += 5;
    reasons.push("Balanced workload");
  } else {
    score -= Math.min(20, (workload - 2) * 7);
    reasons.push(`${workload} jobs scheduled`);
  }

  if (project.priority === ProjectPriority.URGENT && technician.dutyStatus === "on_duty_idle") score += 8;
  if (project.priority === ProjectPriority.HIGH && workload <= 1) score += 4;

  let computedDistance: number | undefined;
  let etaMinutes: number | undefined;
  if (project.siteLocation && technician.lastKnownLocation) {
    const straight = distanceKm(technician.lastKnownLocation, project.siteLocation);
    const estimate = routeEstimate(straight);
    computedDistance = estimate.roadKm;
    etaMinutes = estimate.etaMinutes;
    if (computedDistance <= 5) score += 18;
    else if (computedDistance <= 10) score += 12;
    else if (computedDistance <= 20) score += 5;
    else score -= Math.min(12, Math.round((computedDistance - 20) / 5));
    reasons.unshift(`${computedDistance.toFixed(1)} km · ~${etaMinutes} min ETA`);
  }

  return { technician, score: Math.max(0, Math.min(100, score)), reasons: reasons.slice(0, 4), workload, distanceKm: computedDistance, etaMinutes };
}

export function OperationsControlCenter({
  initialProjects,
  initialTechnicians,
  loadError,
}: OperationsControlCenterProps) {
  const today = useMemo(() => getIndiaDateKey(new Date()), []);

  const [projects, setProjects] = useState(initialProjects);
  const [technicians, setTechnicians] = useState(initialTechnicians);
  const [selectedDate, setSelectedDate] = useState(today);
  const [search, setSearch] = useState("");
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [assignProject, setAssignProject] = useState<Project | null>(null);
  const [assignPriority, setAssignPriority] = useState<ProjectPriority>(ProjectPriority.NORMAL);
  const [assignTechnicianId, setAssignTechnicianId] = useState("");
  const [assignTimeSlot, setAssignTimeSlot] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return projects;

    return projects.filter((project) =>
      [
        project.projectCode,
        project.customerName,
        project.customerPhone,
        project.address,
        project.assignedTechnicianId?.name ?? "",
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [projects, search]);

  const selectedDateJobs = useMemo(
    () =>
      filteredProjects
        .filter(
          (project) =>
            getProjectDateKey(project) === selectedDate &&
            project.status !== ProjectStatus.CANCELLED
        )
        .sort(sortJobs),
    [filteredProjects, selectedDate]
  );

  const unassignedJobs = useMemo(
    () =>
      filteredProjects
        .filter((project) => project.status === ProjectStatus.NEW)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [filteredProjects]
  );

  const overdueJobs = useMemo(
    () =>
      projects.filter((project) => {
        const key = getProjectDateKey(project);
        return (
          key !== null &&
          key < today &&
          project.status !== ProjectStatus.COMPLETED &&
          project.status !== ProjectStatus.CANCELLED
        );
      }),
    [projects, today]
  );

  const completedOnSelectedDate = selectedDateJobs.filter(
    (project) => project.status === ProjectStatus.COMPLETED
  ).length;

  const activeFieldJobs = selectedDateJobs.filter((project) =>
    [ProjectStatus.EN_ROUTE, ProjectStatus.IN_PROGRESS].includes(project.status)
  ).length;

  const onDutyTechnicians = technicians.filter(
    (technician) => technician.isActive && technician.dutyStatus !== "off_duty"
  );

  const jobsByTechnician = useMemo(() => {
    const result = new Map<string, Project[]>();
    for (const technician of technicians) result.set(technician.id, []);

    for (const project of selectedDateJobs) {
      const technicianId = project.assignedTechnicianId?._id;
      if (technicianId && result.has(technicianId)) {
        result.get(technicianId)?.push(project);
      }
    }

    return result;
  }, [selectedDateJobs, technicians]);

  const assignRecommendations = useMemo(() => {
    if (!assignProject) return [] as DispatchRecommendation[];
    return technicians
      .map((technician) => dispatchRecommendation(technician, assignProject, (jobsByTechnician.get(technician.id) ?? []).length))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.workload - b.workload)
      .slice(0, 3);
  }, [assignProject, technicians, jobsByTechnician]);

  async function refreshData() {
    setIsRefreshing(true);
    try {
      const [projectResponse, technicianResponse] = await Promise.all([
        fetch("/api/projects", { cache: "no-store" }),
        fetch("/api/technicians", { cache: "no-store" }),
      ]);
      const projectJson = await projectResponse.json();
      const technicianJson = await technicianResponse.json();

      if (!projectResponse.ok || !projectJson.success) {
        throw new Error(projectJson.message ?? "Could not refresh projects.");
      }
      if (!technicianResponse.ok || !technicianJson.success) {
        throw new Error(technicianJson.message ?? "Could not refresh technicians.");
      }

      setProjects(projectJson.data.projects as Project[]);
      setTechnicians(technicianJson.data.technicians as TechnicianListItem[]);
      setToast({ kind: "success", text: "Operations data refreshed." });
    } catch (error) {
      setToast({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not refresh data.",
      });
    } finally {
      setIsRefreshing(false);
    }
  }

  function openAssignment(project: Project, technicianId = "") {
    setAssignProject(project);
    setAssignTechnicianId(technicianId);
    setAssignTimeSlot("");
    setAssignPriority(project.priority ?? ProjectPriority.NORMAL);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, technician: TechnicianListItem) {
    event.preventDefault();
    const projectId = event.dataTransfer.getData("text/project-id") || draggedProjectId;
    const project = projects.find((item) => item._id === projectId);

    setDraggedProjectId(null);
    if (!project) return;

    if (technician.dutyStatus === "off_duty") {
      setToast({ kind: "error", text: `${technician.name} is currently off duty.` });
      return;
    }

    openAssignment(project, technician.id);
  }

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignProject || !assignTechnicianId || !assignTimeSlot) return;

    setIsAssigning(true);
    try {
      const response = await fetch(`/api/projects/${assignProject._id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianId: assignTechnicianId,
          scheduledDate: selectedDate,
          scheduledTimeSlot: assignTimeSlot,
          priority: assignPriority,
        }),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message ?? "Could not assign technician.");
      }

      const updated = json.data.project as Project;
      setProjects((current) =>
        current.map((project) => (project._id === updated._id ? updated : project))
      );
      setAssignProject(null);
      setToast({
        kind: "success",
        text: `${updated.projectCode} assigned successfully for ${formatDisplayDate(selectedDate)}.`,
      });
    } catch (error) {
      setToast({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not assign technician.",
      });
    } finally {
      setIsAssigning(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {toast && (
        <div
          role="status"
          className={`fixed right-5 top-5 z-[80] max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl ${
            toast.kind === "success"
              ? "border-success/30 bg-surface text-success"
              : "border-danger/30 bg-surface text-danger"
          }`}
        >
          {toast.text}
        </div>
      )}

      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-success" aria-hidden="true" />
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">
              Live Operations
            </p>
          </div>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Operations Control Center</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Dispatch jobs, watch field workload, spot delays and control today&apos;s service operation from one screen.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/tracking" className={ui.btnGhost}>
            ⌖ Live Map
          </Link>
          <Link href="/dashboard/projects" className={ui.btnGhost}>
            ◆ All Projects
          </Link>
          <button type="button" className={ui.btnPrimary} onClick={refreshData} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing…" : "↻ Refresh Ops"}
          </button>
        </div>
      </header>

      {loadError && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          ⚠ {loadError}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Operations summary">
        <Metric label="Scheduled" value={selectedDateJobs.length} note={formatDisplayDate(selectedDate)} />
        <Metric label="Unassigned" value={unassignedJobs.length} note="Waiting for dispatch" tone="warning" />
        <Metric label="In field" value={activeFieldJobs} note="En route / on site" tone="accent" />
        <Metric label="Completed" value={completedOnSelectedDate} note="Selected day" tone="success" />
        <Metric label="On duty" value={onDutyTechnicians.length} note={`${technicians.length} technicians`} tone="success" />
        <Metric label="Overdue" value={overdueJobs.length} note="Needs attention" tone={overdueJobs.length ? "danger" : "default"} />
      </section>

      <section className={`${ui.card} p-4`} aria-label="Control filters">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={selectedDate === today ? ui.btnPrimary : ui.btnGhostSm}
              onClick={() => setSelectedDate(today)}
            >
              Today
            </button>
            <button
              type="button"
              className={selectedDate === offsetDateKey(today, 1) ? ui.btnPrimary : ui.btnGhostSm}
              onClick={() => setSelectedDate(offsetDateKey(today, 1))}
            >
              Tomorrow
            </button>
            <input
              type="date"
              className={`${ui.input} w-auto min-w-[165px]`}
              value={selectedDate}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSelectedDate(event.target.value)}
            />
            <span className="text-xs text-ink-faint">{formatDisplayDate(selectedDate)}</span>
          </div>

          <div className="w-full lg:max-w-sm">
            <input
              className={ui.input}
              placeholder="Search job, customer, phone, technician…"
              value={search}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </section>

      {overdueJobs.length > 0 && (
        <section className="rounded-2xl border border-danger/30 bg-danger/5 p-4" aria-label="Operations alerts">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-danger">Attention required</p>
              <p className="mt-1 text-sm text-ink">
                {overdueJobs.length} scheduled {overdueJobs.length === 1 ? "job is" : "jobs are"} still open from an earlier date.
              </p>
            </div>
            <Link href="/dashboard/projects" className={ui.btnGhostSm}>
              Review overdue jobs →
            </Link>
          </div>
        </section>
      )}

      <div className="grid gap-5 2xl:grid-cols-[340px_minmax(0,1fr)]">
        <section className={`${ui.card} overflow-hidden`} aria-label="Unassigned jobs">
          <div className="border-b border-border-default bg-surface-2/50 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Dispatch Queue</p>
                <p className="mt-0.5 text-xs text-ink-faint">Drag a new job onto an on-duty technician.</p>
              </div>
              <span className="rounded-full border border-warning/40 px-2.5 py-1 font-mono text-xs text-warning">
                {unassignedJobs.length}
              </span>
            </div>
          </div>

          <div className="max-h-[760px] space-y-2 overflow-y-auto p-3">
            {unassignedJobs.length === 0 ? (
              <EmptyState title="Dispatch queue clear" text="No new unassigned jobs are waiting." />
            ) : (
              unassignedJobs.map((project) => (
                <article
                  key={project._id}
                  draggable
                  onDragStart={(event: DragEvent<HTMLElement>) => {
                    event.dataTransfer.setData("text/project-id", project._id);
                    event.dataTransfer.effectAllowed = "move";
                    setDraggedProjectId(project._id);
                  }}
                  onDragEnd={() => setDraggedProjectId(null)}
                  className={`rounded-xl border bg-surface-2/40 p-3 transition ${
                    draggedProjectId === project._id
                      ? "border-accent opacity-60"
                      : "border-border-default hover:border-border-strong"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/dashboard/projects/${project._id}`} className="truncate text-sm font-semibold hover:underline">
                        {project.customerName}
                      </Link>
                      <p className="mt-0.5 font-mono text-[11px] text-ink-faint">{project.projectCode}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="rounded-full border border-border-strong px-2 py-0.5 text-[10px] text-ink-muted">
                        {SERVICE_TYPE_LABELS[project.serviceType]}
                      </span>
                      {project.priority && project.priority !== ProjectPriority.NORMAL ? (
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${project.priority === ProjectPriority.URGENT ? "border-danger/40 text-danger" : "border-warning/40 text-warning"}`}>{PRIORITY_LABELS[project.priority]}</span>
                      ) : null}
                    </div>
                  </div>

                  <p className="mt-2 line-clamp-2 text-xs text-ink-muted">{project.address}</p>
                  {(() => {
                    const best = technicians
                      .map((technician) => dispatchRecommendation(technician, project, (jobsByTechnician.get(technician.id) ?? []).length))
                      .filter((item) => item.score > 0)
                      .sort((a, b) => b.score - a.score)[0];
                    return best ? (
                      <button type="button" onClick={() => openAssignment(project, best.technician.id)} className="mt-3 w-full rounded-lg border border-accent/25 bg-accent/5 px-2.5 py-2 text-left text-[11px] transition hover:border-accent/50">
                        <span className="font-semibold text-accent">✦ Best fit {best.score}%</span>
                        <span className="ml-1 text-ink-muted">{best.technician.name} · {best.reasons.slice(0, 2).join(" · ")}</span>
                      </button>
                    ) : null;
                  })()}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-ink-faint">☷ Drag to dispatch</span>
                    <button type="button" className={ui.btnGhostSm} onClick={() => openAssignment(project)}>
                      Assign
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section aria-label="Technician dispatch board">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Technician Board</h2>
              <p className="mt-0.5 text-xs text-ink-faint">Workload for {formatDisplayDate(selectedDate)}</p>
            </div>
            <span className="text-xs text-ink-faint">Drop only NEW jobs to assign</span>
          </div>

          {technicians.length === 0 ? (
            <div className={`${ui.card} p-8`}>
              <EmptyState title="No technicians found" text="Add technicians to start dispatching jobs." />
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {technicians.map((technician) => {
                const jobs = jobsByTechnician.get(technician.id) ?? [];
                const isOffDuty = technician.dutyStatus === "off_duty";

                return (
                  <div
                    key={technician.id}
                    onDragOver={(event: DragEvent<HTMLDivElement>) => {
                      if (!isOffDuty) {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                      }
                    }}
                    onDrop={(event: DragEvent<HTMLDivElement>) => handleDrop(event, technician)}
                    className={`${ui.card} overflow-hidden transition ${
                      draggedProjectId && !isOffDuty ? "border-accent/60" : ""
                    } ${isOffDuty ? "opacity-75" : ""}`}
                  >
                    <div className="border-b border-border-default bg-surface-2/50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${isOffDuty ? "bg-ink-faint" : "bg-success"}`} />
                            <Link href={`/dashboard/technicians/${technician.id}`} className="truncate text-sm font-semibold hover:underline">
                              {technician.name}
                            </Link>
                          </div>
                          <p className="mt-1 font-mono text-[11px] text-ink-faint">
                            {technician.employeeCode}{technician.vehicleNumber ? ` • ${technician.vehicleNumber}` : ""}
                          </p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${DUTY_STYLES[technician.dutyStatus]}`}>
                          {DUTY_LABELS[technician.dutyStatus]}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-ink-faint">Scheduled jobs</span>
                        <span className="font-mono text-ink">{jobs.length}</span>
                      </div>
                      <p className="mt-1 text-[10px] text-ink-faint">{technician.lastKnownLocation ? `GPS online · ${new Date(technician.lastKnownLocation.recordedAt ?? Date.now()).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "GPS position unavailable"}</p>
                    </div>

                    <div className="min-h-[150px] space-y-2 p-3">
                      {jobs.length === 0 ? (
                        <div className={`flex min-h-[124px] items-center justify-center rounded-xl border border-dashed px-4 text-center text-xs ${
                          isOffDuty ? "border-border-default text-ink-faint" : "border-border-strong text-ink-muted"
                        }`}>
                          {isOffDuty
                            ? "Off duty — assignment blocked"
                            : draggedProjectId
                              ? "Drop job here to dispatch"
                              : "Available — no jobs on this date"}
                        </div>
                      ) : (
                        jobs.map((project) => (
                          <Link
                            key={project._id}
                            href={`/dashboard/projects/${project._id}`}
                            className="block rounded-xl border border-border-default bg-surface-2/35 p-3 transition hover:border-border-strong"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{project.customerName}</p>
                                <p className="mt-0.5 font-mono text-[11px] text-ink-faint">{project.projectCode}</p>
                              </div>
                              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${STATUS_STYLES[project.status]}`}>
                                {STATUS_LABELS[project.status]}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                              <span className="text-ink-muted">{project.scheduledTimeSlot ?? "Time not set"}</span>
                              <span className="text-ink-faint">{SERVICE_TYPE_LABELS[project.serviceType]}</span>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {assignProject && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center pm-modal-backdrop p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dispatch-title"
          onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
            if (event.target === event.currentTarget && !isAssigning) setAssignProject(null);
          }}
        >
          <form onSubmit={submitAssignment} className={`${ui.card} w-full max-w-lg overflow-hidden shadow-2xl`}>
            <div className="border-b border-border-default bg-surface-2/60 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wide text-accent">Smart Dispatch</p>
                  <h2 id="dispatch-title" className="mt-1 text-lg font-semibold">Assign {assignProject.projectCode}</h2>
                  <p className="mt-1 text-xs text-ink-muted">{assignProject.customerName} • {formatDisplayDate(selectedDate)}</p>
                </div>
                <button type="button" className={ui.btnGhostSm} onClick={() => setAssignProject(null)} disabled={isAssigning}>
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {assignRecommendations.length > 0 ? (
                <div className="rounded-2xl border border-accent/25 bg-accent/5 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">✦ Smart recommendation</p><p className="mt-1 text-[11px] text-ink-muted">Ranked by availability, service skill, workload, priority and live GPS proximity when available.</p></div>
                    <span className="rounded-full border border-accent/30 px-2 py-1 text-[10px] font-semibold text-accent">Decision support</span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {assignRecommendations.map((item, index) => (
                      <button
                        key={item.technician.id}
                        type="button"
                        onClick={() => setAssignTechnicianId(item.technician.id)}
                        className={`rounded-xl border p-3 text-left transition ${assignTechnicianId === item.technician.id ? "border-accent bg-accent/10" : "border-border-default bg-surface hover:border-accent/40"}`}
                      >
                        <div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold">{item.technician.name}</span><span className="font-mono text-xs font-bold text-accent">{item.score}%</span></div>
                        <p className="mt-1 text-[10px] text-ink-faint">#{index + 1} · {item.workload} job{item.workload === 1 ? "" : "s"}{item.distanceKm !== undefined ? ` · ${item.distanceKm.toFixed(1)} km · ~${item.etaMinutes} min` : ""}</p>
                        <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-ink-muted">{item.reasons.join(" · ")}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className={ui.label}>Alert level</label>
                  <span className="text-[10px] text-ink-faint">Controls technician reminder intensity</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    { value: ProjectPriority.NORMAL, label: "Normal", text: "1 alert", tone: "border-border-default" },
                    { value: ProjectPriority.HIGH, label: "Medium", text: "15 min reminders", tone: "border-warning/35" },
                    { value: ProjectPriority.URGENT, label: "High", text: "5 min reminders", tone: "border-danger/35" },
                  ].map((item) => (
                    <button key={item.value} type="button" onClick={() => setAssignPriority(item.value)} className={`rounded-xl border p-3 text-left transition ${assignPriority === item.value ? `${item.tone} bg-surface-2 ring-2 ring-accent/10` : "border-border-default bg-surface hover:border-border-strong"}`}>
                      <span className={`block text-xs font-bold ${item.value === ProjectPriority.URGENT ? "text-danger" : item.value === ProjectPriority.HIGH ? "text-warning" : "text-ink"}`}>{item.label}</span>
                      <span className="mt-1 block text-[10px] text-ink-faint">{item.text}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] leading-4 text-ink-faint">High stays prominent until the technician taps Acknowledge. Browser reminders work while the technician app is open and notification permission is enabled.</p>
              </div>

              <div>
                <label htmlFor="dispatch-technician" className={ui.label}>Technician</label>
                <select
                  id="dispatch-technician"
                  className={`${ui.input} mt-1.5`}
                  value={assignTechnicianId}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => setAssignTechnicianId(event.target.value)}
                  required
                >
                  <option value="">Select technician</option>
                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.id} disabled={technician.dutyStatus === "off_duty"}>
                      {technician.name} — {DUTY_LABELS[technician.dutyStatus]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="dispatch-date" className={ui.label}>Schedule date</label>
                  <input id="dispatch-date" className={`${ui.input} mt-1.5`} type="date" value={selectedDate} readOnly />
                </div>
                <div>
                  <label htmlFor="dispatch-slot" className={ui.label}>Time slot</label>
                  <select
                    id="dispatch-slot"
                    className={`${ui.input} mt-1.5`}
                    value={assignTimeSlot}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => setAssignTimeSlot(event.target.value)}
                    required
                  >
                    <option value="">Select slot</option>
                    {TIME_SLOTS.map((slot) => { const occupied = (jobsByTechnician.get(assignTechnicianId) ?? []).some((job) => job.scheduledTimeSlot === slot && job._id !== assignProject._id); return <option key={slot} value={slot} disabled={occupied}>{slot}{occupied ? " — occupied" : ""}</option>; })}
                  </select>
                </div>
              </div>

              {assignTechnicianId && (
                <div className="rounded-xl border border-border-default bg-surface-2/45 px-4 py-3 text-xs text-ink-muted">
                  Existing jobs for this technician on selected date: <span className="font-mono text-ink">{(jobsByTechnician.get(assignTechnicianId) ?? []).length}</span>. Occupied time slots are disabled here and the backend also enforces conflict protection.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border-default px-5 py-4">
              <button type="button" className={ui.btnGhost} onClick={() => setAssignProject(null)} disabled={isAssigning}>Cancel</button>
              <button type="submit" className={ui.btnPrimary} disabled={isAssigning || !assignTechnicianId || !assignTimeSlot}>
                {isAssigning ? "Dispatching…" : "Dispatch Job"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: number;
  note: string;
  tone?: "default" | "success" | "warning" | "danger" | "accent";
}) {
  const valueClass = {
    default: "text-ink",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    accent: "text-accent",
  }[tone];

  return (
    <div className={`${ui.card} p-4`}>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-2 font-mono text-3xl font-semibold ${valueClass}`}>{value}</p>
      <p className="mt-1 truncate text-[11px] text-ink-faint">{note}</p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="px-4 py-9 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-xs text-ink-faint">{text}</p>
    </div>
  );
}
