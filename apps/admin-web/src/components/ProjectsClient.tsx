"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { NewProjectModal } from "@/components/NewProjectModal";
import { ServiceCalendar } from "@/components/ServiceCalendar";

import {
  Project,
  ProjectStatus,
  ProjectPriority,
  PRIORITY_LABELS,
  STATUS_LABELS,
  SERVICE_TYPE_LABELS,
} from "@/types/project";

import { ui } from "@/lib/ui-classes";

type ProjectView =
  | "all"
  | "pending"
  | "upcoming"
  | "today"
  | "in_progress"
  | "completed"
  | "overdue"
  | "cancelled"
  | "unassigned";

interface Props {
  projects: Project[];
  initialSearch?: string;
  initialView?: ProjectView;
  initialFrom?: string;
  initialTo?: string;
  initialServiceType?: string;
}

type SortKey =
  | "projectCode"
  | "customerName"
  | "status"
  | "createdAt";

type SortDir = "asc" | "desc";

type ConfirmTarget =
  | {
      type: "single";
      id: string;
      label: string;
    }
  | null;

type Toast =
  | {
      kind: "success" | "error";
      text: string;
    }
  | null;

interface SavedProjectView {
  id: string;
  name: string;
  search: string;
  viewFilter: ProjectView;
  serviceTypeFilter: string;
  fromDate: string;
  toDate: string;
  statusFilter: ProjectStatus | "all";
  priorityFilter: ProjectPriority | "all";
  sortKey: SortKey;
  sortDir: SortDir;
  displayMode: "list" | "calendar";
}

const STATUS_DOT: Record<ProjectStatus, string> = {
  [ProjectStatus.NEW]: "bg-ink-muted",
  [ProjectStatus.ASSIGNED]: "bg-warning",
  [ProjectStatus.EN_ROUTE]: "bg-accent",
  [ProjectStatus.IN_PROGRESS]: "bg-accent",
  [ProjectStatus.COMPLETED]: "bg-success",
  [ProjectStatus.CANCELLED]: "bg-danger",
};

const STATUS_FILTER_OPTIONS: Array<{
  value: ProjectStatus | "all";
  label: string;
}> = [
  {
    value: "all",
    label: "All Statuses",
  },
  {
    value: ProjectStatus.NEW,
    label: STATUS_LABELS[ProjectStatus.NEW],
  },
  {
    value: ProjectStatus.ASSIGNED,
    label: STATUS_LABELS[ProjectStatus.ASSIGNED],
  },
  {
    value: ProjectStatus.EN_ROUTE,
    label: STATUS_LABELS[ProjectStatus.EN_ROUTE],
  },
  {
    value: ProjectStatus.IN_PROGRESS,
    label: STATUS_LABELS[ProjectStatus.IN_PROGRESS],
  },
  {
    value: ProjectStatus.COMPLETED,
    label: STATUS_LABELS[ProjectStatus.COMPLETED],
  },
  {
    value: ProjectStatus.CANCELLED,
    label: STATUS_LABELS[ProjectStatus.CANCELLED],
  },
];

const PROJECT_VIEW_OPTIONS: Array<{ value: ProjectView; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "upcoming", label: "Upcoming" },
  { value: "today", label: "Today" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
  { value: "unassigned", label: "Unassigned" },
];

function dateKey(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function todayKey(): string {
  return dateKey(new Date().toISOString());
}

function offsetKey(base: string, offset: number): string {
  const [year, month, day] = base.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + offset, 6)).toISOString().slice(0, 10);
}

function dayLabel(key: string, index: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day, 6));
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return value.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

const PAGE_SIZE = 10;

export default function ProjectsClient({
  projects: initialProjects,
  initialSearch = "",
  initialView = "all",
  initialFrom = "",
  initialTo = "",
  initialServiceType = "all",
}: Props) {
  const [projects, setProjects] =
    useState<Project[]>(initialProjects);

  const [search, setSearch] =
    useState(initialSearch);

  const [displayMode, setDisplayMode] =
    useState<"list" | "calendar">("list");

  const [viewFilter, setViewFilter] =
    useState<ProjectView>(initialView);

  const [serviceTypeFilter, setServiceTypeFilter] =
    useState(initialServiceType);

  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);

  const [statusFilter, setStatusFilter] =
    useState<ProjectStatus | "all">("all");

  const [priorityFilter, setPriorityFilter] =
    useState<ProjectPriority | "all">("all");

  const [sortKey, setSortKey] =
    useState<SortKey>("createdAt");

  const [sortDir, setSortDir] =
    useState<SortDir>("desc");

  const [page, setPage] =
    useState(1);

  const [showModal, setShowModal] =
    useState(false);

  const [confirmTarget, setConfirmTarget] =
    useState<ConfirmTarget>(null);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [deletingRowId, setDeletingRowId] =
    useState<string | null>(null);

  const [toast, setToast] =
    useState<Toast>(null);

  const [savedViews, setSavedViews] =
    useState<SavedProjectView[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("pm_project_saved_views");
      if (stored) setSavedViews(JSON.parse(stored) as SavedProjectView[]);
    } catch {
      window.localStorage.removeItem("pm_project_saved_views");
    }
  }, []);

  /*
   * Server-rendered page can receive fresh
   * backend data after navigation/revalidation.
   */
  useEffect(() => {
    setProjects(initialProjects);
    setSearch(initialSearch);
    setViewFilter(initialView);
    setServiceTypeFilter(initialServiceType);
    setFromDate(initialFrom);
    setToDate(initialTo);
  }, [initialProjects, initialSearch, initialView, initialServiceType, initialFrom, initialTo]);

  /*
   * Automatically remove toast after a short
   * period.
   */
  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast]);

  /*
   * Reset pagination when filters change.
   */
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, priorityFilter, viewFilter, serviceTypeFilter, fromDate, toDate]);

  /*
   * Escape closes confirmation dialog.
   */
  useEffect(() => {
    if (!confirmTarget) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        !isDeleting
      ) {
        setConfirmTarget(null);
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [confirmTarget, isDeleting]);

  /*
   * Client-side search/sort/pagination is only
   * presentation logic.
   *
   * IMPORTANT:
   * Authorization and branch/company filtering
   * are performed by the backend.
   */
  const filteredProjects = useMemo(() => {
    const keyword =
      search.toLowerCase().trim();

    let result = projects.filter(
      (project) => {
        const matchesKeyword =
          !keyword ||
          project.projectCode
            .toLowerCase()
            .includes(keyword) ||
          project.customerName
            .toLowerCase()
            .includes(keyword) ||
          (
            project.customerPhone ?? ""
          )
            .toLowerCase()
            .includes(keyword);

        const matchesStatus =
          statusFilter === "all" ||
          project.status === statusFilter;

        const matchesService =
          serviceTypeFilter === "all" ||
          project.serviceType === serviceTypeFilter;

        const matchesPriority =
          priorityFilter === "all" ||
          (project.priority ?? ProjectPriority.NORMAL) === priorityFilter;

        const scheduled = dateKey(project.scheduledDate);
        const today = todayKey();
        const isActive = project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELLED;

        const matchesView =
          viewFilter === "all" ||
          (viewFilter === "pending" && [ProjectStatus.NEW, ProjectStatus.ASSIGNED].includes(project.status)) ||
          (viewFilter === "upcoming" && isActive && Boolean(scheduled) && scheduled > today) ||
          (viewFilter === "today" && project.status !== ProjectStatus.CANCELLED && scheduled === today) ||
          (viewFilter === "in_progress" && [ProjectStatus.EN_ROUTE, ProjectStatus.IN_PROGRESS].includes(project.status)) ||
          (viewFilter === "completed" && project.status === ProjectStatus.COMPLETED) ||
          (viewFilter === "overdue" && isActive && Boolean(scheduled) && scheduled < today) ||
          (viewFilter === "cancelled" && project.status === ProjectStatus.CANCELLED) ||
          (viewFilter === "unassigned" && isActive && !project.assignedTechnicianId);

        const matchesFrom = !fromDate || (Boolean(scheduled) && scheduled >= fromDate);
        const matchesTo = !toDate || (Boolean(scheduled) && scheduled <= toDate);

        return (
          matchesKeyword &&
          matchesStatus &&
          matchesService &&
          matchesPriority &&
          matchesView &&
          matchesFrom &&
          matchesTo
        );
      }
    );

    result = [...result].sort(
      (a, b) => {
        let comparison = 0;

        if (
          sortKey === "projectCode"
        ) {
          comparison =
            a.projectCode.localeCompare(
              b.projectCode
            );
        } else if (
          sortKey === "customerName"
        ) {
          comparison =
            a.customerName.localeCompare(
              b.customerName
            );
        } else if (
          sortKey === "status"
        ) {
          comparison =
            STATUS_LABELS[
              a.status
            ].localeCompare(
              STATUS_LABELS[
                b.status
              ]
            );
        } else {
          comparison =
            new Date(
              a.createdAt
            ).getTime() -
            new Date(
              b.createdAt
            ).getTime();
        }

        return sortDir === "asc"
          ? comparison
          : -comparison;
      }
    );

    return result;
  }, [
    projects,
    search,
    statusFilter,
    priorityFilter,
    viewFilter,
    serviceTypeFilter,
    fromDate,
    toDate,
    sortKey,
    sortDir,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredProjects.length /
        PAGE_SIZE
    )
  );

  const pagedProjects =
    useMemo(() => {
      const start =
        (page - 1) *
        PAGE_SIZE;

      return filteredProjects.slice(
        start,
        start + PAGE_SIZE
      );
    }, [
      filteredProjects,
      page,
    ]);

  function toggleSort(
    key: SortKey
  ) {
    if (sortKey === key) {
      setSortDir(
        (previous) =>
          previous === "asc"
            ? "desc"
            : "asc"
      );

      return;
    }

    setSortKey(key);
    setSortDir("asc");
  }

  function sortIndicator(
    key: SortKey
  ) {
    if (sortKey !== key) {
      return null;
    }

    return (
      <span className="ml-1 text-accent">
        {sortDir === "asc"
          ? "↑"
          : "↓"}
      </span>
    );
  }

  const scheduleLens = useMemo(() => {
    const today = todayKey();
    return Array.from({ length: 7 }, (_, index) => {
      const key = offsetKey(today, index);
      const rows = projects.filter((project) => dateKey(project.scheduledDate) === key && project.status !== ProjectStatus.CANCELLED);
      return {
        key,
        index,
        label: dayLabel(key, index),
        total: rows.length,
        active: rows.filter((project) => project.status !== ProjectStatus.COMPLETED).length,
        unassigned: rows.filter((project) => !project.assignedTechnicianId && project.status !== ProjectStatus.COMPLETED).length,
      };
    });
  }, [projects]);

  const viewCounts = useMemo(() => {
    const today = todayKey();
    const count = (view: ProjectView) => projects.filter((project) => {
      const scheduled = dateKey(project.scheduledDate);
      const isActive = project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELLED;
      if (view === "all") return true;
      if (view === "pending") return [ProjectStatus.NEW, ProjectStatus.ASSIGNED].includes(project.status);
      if (view === "upcoming") return isActive && Boolean(scheduled) && scheduled > today;
      if (view === "today") return project.status !== ProjectStatus.CANCELLED && scheduled === today;
      if (view === "in_progress") return [ProjectStatus.EN_ROUTE, ProjectStatus.IN_PROGRESS].includes(project.status);
      if (view === "completed") return project.status === ProjectStatus.COMPLETED;
      if (view === "overdue") return isActive && Boolean(scheduled) && scheduled < today;
      if (view === "cancelled") return project.status === ProjectStatus.CANCELLED;
      return isActive && !project.assignedTechnicianId;
    }).length;
    return Object.fromEntries(PROJECT_VIEW_OPTIONS.map((option) => [option.value, count(option.value)])) as Record<ProjectView, number>;
  }, [projects]);

  function clearFilters() {
    setSearch("");
    setViewFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setServiceTypeFilter("all");
    setFromDate("");
    setToDate("");
  }

  function saveCurrentView() {
    const name = window.prompt("Name this project view", viewFilter === "all" ? "My service view" : `${PROJECT_VIEW_OPTIONS.find((item) => item.value === viewFilter)?.label ?? "Service"} view`);
    if (!name?.trim()) return;
    const view: SavedProjectView = {
      id: `${Date.now()}`,
      name: name.trim(),
      search,
      viewFilter,
      serviceTypeFilter,
      fromDate,
      toDate,
      statusFilter,
      priorityFilter,
      sortKey,
      sortDir,
      displayMode,
    };
    const next = [view, ...savedViews.filter((item) => item.name.toLowerCase() !== view.name.toLowerCase())].slice(0, 8);
    setSavedViews(next);
    window.localStorage.setItem("pm_project_saved_views", JSON.stringify(next));
    setToast({ kind: "success", text: `Saved view “${view.name}”.` });
  }

  function applySavedView(id: string) {
    const view = savedViews.find((item) => item.id === id);
    if (!view) return;
    setSearch(view.search);
    setViewFilter(view.viewFilter);
    setServiceTypeFilter(view.serviceTypeFilter);
    setFromDate(view.fromDate);
    setToDate(view.toDate);
    setStatusFilter(view.statusFilter);
    setPriorityFilter(view.priorityFilter);
    setSortKey(view.sortKey);
    setSortDir(view.sortDir);
    setDisplayMode(view.displayMode);
  }

  async function handleConfirmDelete() {
    if (!confirmTarget) {
      return;
    }

    setIsDeleting(true);

    try {
      setDeletingRowId(
          confirmTarget.id
        );

        const response =
          await fetch(
            `/api/projects/${encodeURIComponent(
              confirmTarget.id
            )}`,
            {
              method: "DELETE",
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Delete failed"
          );
        }

        setProjects(
          (previous) =>
            previous.filter(
              (project) =>
                project._id !==
                  confirmTarget.id
            )
        );

        setToast({
          kind: "success",
          text:
            "Project deleted successfully.",
        });

      setConfirmTarget(null);
    } catch (error) {
      setToast({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Server error.",
      });
    } finally {
      setIsDeleting(false);
      setDeletingRowId(null);
    }
  }

  return (
    <>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-6 top-6 z-[70] rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl ${
            toast.kind === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className={`${ui.card} mb-6 p-5`}>
        <div className="flex flex-wrap gap-2 border-b border-border-default pb-4">
          {PROJECT_VIEW_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => setViewFilter(option.value)}
              className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                viewFilter === option.value
                  ? "border-accent bg-accent text-accent-ink shadow-sm"
                  : "border-border-default bg-surface-2 text-ink-muted hover:border-accent/50 hover:text-ink"
              }`}
            >
              {option.label} <span className="ml-1 opacity-70">{viewCounts[option.value]}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(240px,1.3fr)_170px_150px_170px_145px_145px_auto] xl:items-end">
          <label className="text-xs text-ink-muted">Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Project code, customer or phone…"
              aria-label="Search projects"
              className={`${ui.input} mt-1`}
            />
          </label>

          <label className="text-xs text-ink-muted">Service
            <select className={`${ui.input} mt-1`} value={serviceTypeFilter} onChange={(event) => setServiceTypeFilter(event.target.value)}>
              <option value="all">All service types</option>
              {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label className="text-xs text-ink-muted">Workflow status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ProjectStatus | "all")}
              aria-label="Filter by status"
              className={`${ui.input} mt-1`}
            >
              {STATUS_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label className="text-xs text-ink-muted">Priority
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as ProjectPriority | "all")}
              aria-label="Filter by priority"
              className={`${ui.input} mt-1`}
            >
              <option value="all">All priorities</option>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label className="text-xs text-ink-muted">From
            <input type="date" className={`${ui.input} mt-1`} value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>

          <label className="text-xs text-ink-muted">To
            <input type="date" className={`${ui.input} mt-1`} value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>

          <div className="flex gap-2">
            <button type="button" className={ui.btnGhostSm} onClick={clearFilters}>Reset</button>
            <button type="button" className={ui.btnPrimary} onClick={() => setShowModal(true)}>+ New Project</button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
          <span><b className="text-ink">{filteredProjects.length}</b> matching service{filteredProjects.length === 1 ? "" : "s"}</span>
          <div className="flex flex-wrap items-center gap-2">
            {savedViews.length ? (
              <select aria-label="Open saved project view" defaultValue="" onChange={(event) => { if (event.target.value) applySavedView(event.target.value); event.currentTarget.value = ""; }} className="h-9 rounded-lg border border-border-default bg-surface-2 px-2 text-xs text-ink">
                <option value="">Saved views…</option>
                {savedViews.map((view) => <option key={view.id} value={view.id}>{view.name}</option>)}
              </select>
            ) : null}
            <button type="button" className={ui.btnGhostSm} onClick={saveCurrentView}>☆ Save view</button>
            <span>View</span>
            <button type="button" className={displayMode === "list" ? ui.btnPrimary : ui.btnGhostSm} onClick={() => setDisplayMode("list")}>List</button>
            <button type="button" className={displayMode === "calendar" ? ui.btnPrimary : ui.btnGhostSm} onClick={() => setDisplayMode("calendar")}>Calendar</button>
          </div>
        </div>
      </div>

      <section className={`${ui.card} mb-6 p-4`} aria-label="Seven day schedule lens">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">7-day schedule lens</p><p className="mt-1 text-xs text-ink-muted">Click a day to isolate its scheduled services instantly.</p></div>
          <button type="button" className={ui.btnGhostSm} onClick={() => { setFromDate(""); setToDate(""); }}>Clear day focus</button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {scheduleLens.map((day) => (
            <button key={day.key} type="button" onClick={() => { setViewFilter("all"); setFromDate(day.key); setToDate(day.key); }} className={`rounded-xl border p-3 text-left transition hover:border-accent/50 ${(fromDate === day.key && toDate === day.key) ? "border-accent bg-accent/10" : "border-border-default bg-surface-2/50"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{day.label}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{day.total}</p>
              <p className="mt-1 text-[10px] text-ink-muted">{day.active} active{day.unassigned ? ` · ${day.unassigned} unassigned` : ""}</p>
            </button>
          ))}
        </div>
      </section>

      {displayMode === "calendar" ? (
        <ServiceCalendar projects={filteredProjects} onDaySelect={(key) => { setFromDate(key); setToDate(key); setDisplayMode("list"); setPage(1); }} />
      ) : (
      <div
        className={`${ui.card} overflow-hidden`}
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default bg-surface-2">
              <th className="p-4 text-left">
                <button
                  type="button"
                  onClick={() =>
                    toggleSort(
                      "projectCode"
                    )
                  }
                  className="inline-flex items-center font-semibold hover:text-accent"
                >
                  Project
                  {sortIndicator(
                    "projectCode"
                  )}
                </button>
              </th>

              <th className="p-4 text-left">
                <button
                  type="button"
                  onClick={() =>
                    toggleSort(
                      "customerName"
                    )
                  }
                  className="inline-flex items-center font-semibold hover:text-accent"
                >
                  Customer
                  {sortIndicator(
                    "customerName"
                  )}
                </button>
              </th>

              <th className="p-4 text-left">
                Service
              </th>

              <th className="p-4 text-left">
                <button
                  type="button"
                  onClick={() =>
                    toggleSort("status")
                  }
                  className="inline-flex items-center font-semibold hover:text-accent"
                >
                  Status
                  {sortIndicator(
                    "status"
                  )}
                </button>
              </th>

              <th className="p-4 text-center">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {pagedProjects.length ===
            0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-14 text-center text-ink-muted"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">
                      📋
                    </span>

                    <span>
                      No Projects Found
                    </span>

                    {(search || statusFilter !== "all" || priorityFilter !== "all" || viewFilter !== "all" || serviceTypeFilter !== "all" || fromDate || toDate) && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-1 text-sm font-medium text-accent hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pagedProjects.map(
                (project) => (
                  <tr
                    key={project._id}
                    className="border-t border-border-default hover:bg-surface-2"
                  >
                    <td className="p-4">
                      <Link
                        href={`/dashboard/projects/${project._id}`}
                        className="font-semibold text-accent hover:underline"
                      >
                        {
                          project.projectCode
                        }
                      </Link>
                    </td>

                    <td className="p-4">
                      <div className="font-medium">
                        {
                          project.customerName
                        }
                      </div>

                      <div className="text-xs text-ink-muted">
                        {
                          project.customerPhone
                        }
                      </div>
                    </td>

                    <td className="p-4">
                      {
                        SERVICE_TYPE_LABELS[
                          project
                            .serviceType
                        ]
                      }
                    </td>

                    <td className="p-4">
                      <span className="inline-flex items-center gap-2 rounded-full border border-border-default px-3 py-1 text-sm">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            STATUS_DOT[
                              project.status
                            ]
                          }`}
                        />

                        {
                          STATUS_LABELS[
                            project.status
                          ]
                        }
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmTarget(
                            {
                              type: "single",
                              id: project._id,
                              label:
                                project.projectCode,
                            }
                          )
                        }
                        disabled={
                          deletingRowId ===
                          project._id
                        }
                        className="rounded-lg bg-red-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingRowId ===
                        project._id
                          ? "Deleting..."
                          : "🗑 Delete"}
                      </button>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>

        {filteredProjects.length >
          0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border-default p-4 sm:flex-row">
            <span className="text-sm text-ink-muted">
              Showing{" "}
              {(page - 1) *
                PAGE_SIZE +
                1}
              –
              {Math.min(
                page * PAGE_SIZE,
                filteredProjects.length
              )}{" "}
              of{" "}
              {
                filteredProjects.length
              }
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setPage(
                    (previous) =>
                      Math.max(
                        1,
                        previous - 1
                      )
                  )
                }
                disabled={page === 1}
                className={
                  ui.btnGhostSm
                }
              >
                ← Prev
              </button>

              <span className="px-2 text-sm text-ink-muted">
                Page {page} of{" "}
                {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setPage(
                    (previous) =>
                      Math.min(
                        totalPages,
                        previous + 1
                      )
                  )
                }
                disabled={
                  page === totalPages
                }
                className={
                  ui.btnGhostSm
                }
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {showModal && (
        <NewProjectModal
          onClose={() =>
            setShowModal(false)
          }
          onCreated={(project) => {
            setShowModal(false);

            setProjects(
              (previous) => [
                project,
                ...previous,
              ]
            );

            setToast({
              kind: "success",
              text:
                "Project created.",
            });
          }}
        />
      )}

      {confirmTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center pm-modal-backdrop p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
          onClick={() =>
            !isDeleting &&
            setConfirmTarget(null)
          }
        >
          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            className={`${ui.card} w-full max-w-sm p-6 shadow-2xl`}
          >
            <h2
              id="confirm-delete-title"
              className="text-lg font-semibold"
            >
              Delete this project?
            </h2>

            <p className="mt-2 text-sm text-ink-muted">
              {`This will permanently delete project ${confirmTarget.label}. This action cannot be undone.`}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setConfirmTarget(null)
                }
                disabled={isDeleting}
                className={ui.btnGhost}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleConfirmDelete
                }
                disabled={isDeleting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}