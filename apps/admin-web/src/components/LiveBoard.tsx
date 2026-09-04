"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Project, ProjectStatus, STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/types/project";
import { ui } from "@/lib/ui-classes";
import { NewProjectModal } from "./NewProjectModal";
import { AssignModal } from "./AssignModal";

interface LiveBoardProps {
  initialProjects: Project[];
}

interface StatusColumn {
  key: ProjectStatus;
  dot: string;
  badgeClass: string;
}

const STATUS_COLUMNS: StatusColumn[] = [
  { key: ProjectStatus.NEW, dot: "bg-ink-muted", badgeClass: "border-border-strong text-ink-muted" },
  { key: ProjectStatus.ASSIGNED, dot: "bg-warning", badgeClass: "border-warning/40 text-warning" },
  { key: ProjectStatus.EN_ROUTE, dot: "bg-accent", badgeClass: "border-accent/40 text-accent" },
  { key: ProjectStatus.IN_PROGRESS, dot: "bg-accent", badgeClass: "border-accent/40 text-accent" },
  { key: ProjectStatus.COMPLETED, dot: "bg-success", badgeClass: "border-success/40 text-success" },
];

function formatSchedule(project: Project): string | null {
  if (!project.scheduledDate) return null;
  const date = new Date(project.scheduledDate);
  // Explicit timeZone pins the calendar date used, regardless of
  // the server process's or browser's system timezone — without
  // this, a project scheduled near midnight IST could render a
  // different date server-side (SSR) vs client-side (hydration) if
  // the two environments have different default timezones, which
  // Next.js would report as a hydration mismatch.
  const dateStr = date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
  return project.scheduledTimeSlot ? `${dateStr}, ${project.scheduledTimeSlot}` : dateStr;
}

export function LiveBoard({ initialProjects }: LiveBoardProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [showNewProject, setShowNewProject] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Project | null>(null);

  const serviceOptions = useMemo(() => {
    const set = new Set(projects.map((p) => p.serviceType));
    return Array.from(set);
  }, [projects]);

  const visibleProjects = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    return projects.filter((project) => {
      const matchesKeyword =
        !keyword ||
        project.customerName.toLowerCase().includes(keyword) ||
        project.projectCode.toLowerCase().includes(keyword) ||
        (project.customerPhone ?? "").toLowerCase().includes(keyword);

      const matchesService =
        serviceFilter === "all" || project.serviceType === serviceFilter;

      return matchesKeyword && matchesService;
    });
  }, [projects, search, serviceFilter]);

  const grouped = useMemo(() => {
    const map = new Map<ProjectStatus, Project[]>();
    for (const col of STATUS_COLUMNS) map.set(col.key, []);
    for (const project of visibleProjects) {
      if (project.status === ProjectStatus.CANCELLED) continue;
      map.get(project.status)?.push(project);
    }
    return map;
  }, [visibleProjects]);

  const stats = useMemo(
    () => ({
      total: projects.filter((p) => p.status !== ProjectStatus.CANCELLED).length,
      completed: projects.filter((p) => p.status === ProjectStatus.COMPLETED).length,
      pending: projects.filter(
        (p) => p.status !== ProjectStatus.COMPLETED && p.status !== ProjectStatus.CANCELLED
      ).length,
    }),
    [projects]
  );

  const isFiltering = search.trim().length > 0 || serviceFilter !== "all";
  const hasNoProjectsAtAll = projects.length === 0;
  const hasNoMatches = !hasNoProjectsAtAll && isFiltering && visibleProjects.length === 0;

  function handleCreated(project: Project) {
    setProjects((prev) => [project, ...prev]);
    setShowNewProject(false);
  }

  function handleAssigned(updated: Project) {
    setProjects((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
    setAssignTarget(null);
  }

  function handleRefresh() {
    setRefreshError(null);
    startRefresh(() => {
      try {
        router.refresh();
      } catch {
        setRefreshError("Could not refresh the board. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-7">
      <section
        aria-label="Summary"
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div className="grid flex-1 grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
          {[
            { label: "Total jobs", value: stats.total },
            { label: "Pending", value: stats.pending },
            { label: "Completed", value: stats.completed },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`${ui.card} px-5 py-[18px] transition-colors hover:border-border-strong`}
            >
              <p className="mb-2 text-[13px] text-ink-muted">{stat.label}</p>
              <p className="font-mono text-[26px] font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-busy={isRefreshing}
            className={ui.btnGhost}
          >
            {isRefreshing ? "Refreshing…" : "↻ Refresh"}
          </button>
          <button type="button" className={ui.btnPrimary} onClick={() => setShowNewProject(true)}>
            + New Project
          </button>
        </div>
      </section>

      {refreshError && (
        <div className={`${ui.errorText} ${ui.card} border-danger/30 bg-danger/5 px-4 py-3`}>
          {refreshError}
        </div>
      )}

      <section aria-label="Filters" className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search by customer, project code or phone..."
          aria-label="Search jobs"
          className="flex-1 rounded-xl border border-border-default bg-surface px-4 py-2.5 text-sm outline-none focus:border-accent"
        />

        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          aria-label="Filter by service type"
          className="rounded-xl border border-border-default bg-surface px-4 py-2.5 text-sm outline-none focus:border-accent sm:w-56"
        >
          <option value="all">All Service Types</option>
          {serviceOptions.map((type) => (
            <option key={type} value={type}>
              {SERVICE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </section>

      {hasNoProjectsAtAll ? (
        <div className={`${ui.card} flex flex-col items-center gap-3 px-6 py-16 text-center`}>
          <span className="text-4xl">🗂️</span>
          <p className="text-sm font-medium text-ink">No jobs yet</p>
          <p className="max-w-sm text-[13px] text-ink-muted">
            Create your first project to see it move across the live board.
          </p>
          <button
            type="button"
            className={`${ui.btnPrimary} mt-2`}
            onClick={() => setShowNewProject(true)}
          >
            + New Project
          </button>
        </div>
      ) : hasNoMatches ? (
        <div className={`${ui.card} flex flex-col items-center gap-3 px-6 py-16 text-center`}>
          <span className="text-4xl">🔍</span>
          <p className="text-sm font-medium text-ink">No jobs match your filters</p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setServiceFilter("all");
            }}
            className="text-sm font-medium text-accent hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <section aria-label="Live job board" className="overflow-x-auto pb-2">
          <div className="grid grid-cols-[repeat(5,minmax(240px,1fr))] gap-4">
            {STATUS_COLUMNS.map((col) => {
              const colProjects = grouped.get(col.key) ?? [];
              return (
                <div key={col.key} className={`${ui.card} min-h-[320px] p-4`}>
                  <div className="mb-4 flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${col.dot}`} aria-hidden="true" />
                    <h3 className="text-sm font-medium">{STATUS_LABELS[col.key]}</h3>
                    <span className="ml-auto rounded-full border border-border-default px-2 py-0.5 font-mono text-[11px] text-ink-faint">
                      {colProjects.length}
                    </span>
                  </div>

                  {colProjects.length === 0 ? (
                    <div className="flex items-center justify-center rounded-lg border border-dashed border-border-default px-2 py-8 text-center text-[13px] text-ink-faint">
                      No jobs
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-2.5">
                      {colProjects.map((project) => (
                        <li
                          key={project._id}
                          className="rounded-lg border border-border-default bg-surface-2 p-3 transition-colors hover:border-border-strong"
                        >
                          <Link href={`/dashboard/projects/${project._id}`} className="block">
                            <p className="mb-0.5 truncate text-[13px] font-semibold hover:underline">
                              {project.customerName}
                            </p>
                            <p className="mb-1.5 font-mono text-[11px] text-ink-faint">
                              {project.projectCode}
                            </p>

                            <span
                              className={`mb-1.5 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${col.badgeClass}`}
                            >
                              {SERVICE_TYPE_LABELS[project.serviceType]}
                            </span>

                            {formatSchedule(project) && (
                              <p className="mt-1.5 text-xs text-ink-muted">
                                📅 {formatSchedule(project)}
                              </p>
                            )}
                          </Link>
                          {project.status === ProjectStatus.NEW && (
                            <button
                              type="button"
                              className={`${ui.btnGhostSm} mt-2 h-8 w-full text-xs`}
                              onClick={() => setAssignTarget(project)}
                            >
                              Assign
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {showNewProject && (
        <NewProjectModal onClose={() => setShowNewProject(false)} onCreated={handleCreated} />
      )}

      {assignTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pm-modal-backdrop p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-modal-title"
          onClick={() => setAssignTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <p id="assign-modal-title" className="text-xs text-ink-muted">
                Assigning{" "}
                <span className="font-mono text-ink">{assignTarget.projectCode}</span> —{" "}
                {assignTarget.customerName}
              </p>
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                aria-label="Close"
                className={ui.btnGhostSm}
              >
                ✕
              </button>
            </div>

            <AssignModal
              projectId={assignTarget._id}
              projectStatus={assignTarget.status}
              onAssigned={handleAssigned}
            />
          </div>
        </div>
      )}
    </div>
  );
}