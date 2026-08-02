"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Project, ProjectStatus, STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/types/project";
import { ui } from "@/lib/ui-classes";
import { NewProjectModal } from "./NewProjectModal";
import { AssignModal } from "./AssignModal";

interface LiveBoardProps {
  initialProjects: Project[];
}

const STATUS_COLUMNS: { key: ProjectStatus; dot: string }[] = [
  { key: ProjectStatus.NEW, dot: "bg-ink-muted" },
  { key: ProjectStatus.ASSIGNED, dot: "bg-warning" },
  { key: ProjectStatus.EN_ROUTE, dot: "bg-accent" },
  { key: ProjectStatus.IN_PROGRESS, dot: "bg-accent" },
  { key: ProjectStatus.COMPLETED, dot: "bg-success" },
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
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showNewProject, setShowNewProject] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Project | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<ProjectStatus, Project[]>();
    for (const col of STATUS_COLUMNS) map.set(col.key, []);
    for (const project of projects) {
      if (project.status === ProjectStatus.CANCELLED) continue;
      map.get(project.status)?.push(project);
    }
    return map;
  }, [projects]);

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

  function handleCreated(project: Project) {
    setProjects((prev) => [project, ...prev]);
    setShowNewProject(false);
  }

  function handleAssigned(updated: Project) {
    setProjects((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
    setAssignTarget(null);
  }

  return (
    <div className="flex flex-col gap-7">
      <section aria-label="Summary" className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid flex-1 grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
          {[
            { label: "Total jobs", value: stats.total },
            { label: "Pending", value: stats.pending },
            { label: "Completed", value: stats.completed },
          ].map((stat) => (
            <div key={stat.label} className={`${ui.card} px-5 py-[18px]`}>
              <p className="mb-2 text-[13px] text-ink-muted">{stat.label}</p>
              <p className="font-mono text-[26px] font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>

        <button type="button" className={ui.btnPrimary} onClick={() => setShowNewProject(true)}>
          + New Project
        </button>
      </section>

      <section aria-label="Live job board" className="overflow-x-auto">
        <div className="grid grid-cols-5 gap-4">
          {STATUS_COLUMNS.map((col) => {
            const colProjects = grouped.get(col.key) ?? [];
            return (
              <div key={col.key} className={`${ui.card} min-h-[320px] min-w-[240px] p-4`}>
                <div className="mb-4 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${col.dot}`} aria-hidden="true" />
                  <h3 className="text-sm">{STATUS_LABELS[col.key]}</h3>
                  <span className="ml-auto font-mono text-xs text-ink-faint">{colProjects.length}</span>
                </div>

                {colProjects.length === 0 ? (
                  <div className="flex items-center justify-center px-2 py-8 text-[13px] text-ink-faint">
                    No jobs
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {colProjects.map((project) => (
                      <li
                        key={project._id}
                        className="rounded-lg border border-border-default bg-surface-2 p-3"
                      >
                        <Link href={`/dashboard/projects/${project._id}`} className="block">
                          <p className="mb-0.5 text-[13px] font-semibold hover:underline">
                            {project.customerName}
                          </p>
                          <p className="mb-1.5 font-mono text-[11px] text-ink-faint">
                            {project.projectCode}
                          </p>
                          <p className="mb-1.5 text-xs text-ink-muted">
                            {SERVICE_TYPE_LABELS[project.serviceType]}
                          </p>
                          {formatSchedule(project) && (
                            <p className="mb-2 text-xs text-ink-muted">{formatSchedule(project)}</p>
                          )}
                        </Link>
                        {project.status === ProjectStatus.NEW && (
                          <button
                            type="button"
                            className={`${ui.btnGhostSm} h-8 w-full text-xs`}
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

      {showNewProject && (
        <NewProjectModal onClose={() => setShowNewProject(false)} onCreated={handleCreated} />
      )}
      {assignTarget && (
        <AssignModal
          project={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  );
}
