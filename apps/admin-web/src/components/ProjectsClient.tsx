"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NewProjectModal } from "@/components/NewProjectModal";
import {
  Project,
  ProjectStatus,
  STATUS_LABELS,
  SERVICE_TYPE_LABELS,
} from "@/types/project";
import { ui } from "@/lib/ui-classes";

interface Props {
  projects: Project[];
}

type SortKey = "projectCode" | "customerName" | "status" | "createdAt";
type SortDir = "asc" | "desc";

type ConfirmTarget =
  | { type: "single"; id: string; label: string }
  | { type: "all" }
  | null;

type Toast = { kind: "success" | "error"; text: string } | null;

const STATUS_DOT: Record<ProjectStatus, string> = {
  [ProjectStatus.NEW]: "bg-ink-muted",
  [ProjectStatus.ASSIGNED]: "bg-warning",
  [ProjectStatus.EN_ROUTE]: "bg-accent",
  [ProjectStatus.IN_PROGRESS]: "bg-accent",
  [ProjectStatus.COMPLETED]: "bg-success",
  [ProjectStatus.CANCELLED]: "bg-danger",
};

const STATUS_FILTER_OPTIONS: Array<{ value: ProjectStatus | "all"; label: string }> = [
  { value: "all", label: "All Statuses" },
  { value: ProjectStatus.NEW, label: STATUS_LABELS[ProjectStatus.NEW] },
  { value: ProjectStatus.ASSIGNED, label: STATUS_LABELS[ProjectStatus.ASSIGNED] },
  { value: ProjectStatus.EN_ROUTE, label: STATUS_LABELS[ProjectStatus.EN_ROUTE] },
  { value: ProjectStatus.IN_PROGRESS, label: STATUS_LABELS[ProjectStatus.IN_PROGRESS] },
  { value: ProjectStatus.COMPLETED, label: STATUS_LABELS[ProjectStatus.COMPLETED] },
  { value: ProjectStatus.CANCELLED, label: STATUS_LABELS[ProjectStatus.CANCELLED] },
];

const PAGE_SIZE = 10;

export default function ProjectsClient({ projects: initialProjects }: Props) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (!confirmTarget) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isDeleting) setConfirmTarget(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmTarget, isDeleting]);

  const filteredProjects = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    let result = projects.filter((project) => {
      const matchesKeyword =
        !keyword ||
        project.projectCode.toLowerCase().includes(keyword) ||
        project.customerName.toLowerCase().includes(keyword) ||
        (project.customerPhone ?? "").toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;

      return matchesKeyword && matchesStatus;
    });

    result = [...result].sort((a, b) => {
      let comparison = 0;

      if (sortKey === "projectCode") {
        comparison = a.projectCode.localeCompare(b.projectCode);
      } else if (sortKey === "customerName") {
        comparison = a.customerName.localeCompare(b.customerName);
      } else if (sortKey === "status") {
        comparison = STATUS_LABELS[a.status].localeCompare(STATUS_LABELS[b.status]);
      } else {
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      return sortDir === "asc" ? comparison : -comparison;
    });

    return result;
  }, [projects, search, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const pagedProjects = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProjects.slice(start, start + PAGE_SIZE);
  }, [filteredProjects, page]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null;
    return <span className="ml-1 text-accent">{sortDir === "asc" ? "▲" : "▼"}</span>;
  }

  async function handleConfirmDelete() {
    if (!confirmTarget) return;
    setIsDeleting(true);

    try {
      if (confirmTarget.type === "all") {
        const res = await fetch("/api/projects/delete-all", {
          method: "DELETE",
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Delete failed");
        }

        setProjects([]);
        setToast({ kind: "success", text: "All testing projects deleted." });
      } else {
        setDeletingRowId(confirmTarget.id);
        const res = await fetch(`/api/projects/${confirmTarget.id}`, {
          method: "DELETE",
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Delete failed");
        }

        setProjects((prev) => prev.filter((p) => p._id !== confirmTarget.id));
        setToast({ kind: "success", text: "Project deleted." });
      }

      setConfirmTarget(null);
    } catch (err) {
      setToast({
        kind: "error",
        text: err instanceof Error ? err.message : "Server error.",
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

      <div className={`${ui.card} p-5 mb-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search by Project Code, Customer or Phone..."
              aria-label="Search projects"
              className="flex-1 rounded-xl border border-border-default bg-surface px-4 py-3 outline-none focus:border-accent"
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as ProjectStatus | "all")
              }
              aria-label="Filter by status"
              className="rounded-xl border border-border-default bg-surface px-4 py-3 outline-none focus:border-accent sm:w-48"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className={ui.btnPrimary}
              onClick={() => setShowModal(true)}
            >
              ➕ New Project
            </button>

            <button
              type="button"
              onClick={() => setConfirmTarget({ type: "all" })}
              disabled={projects.length === 0}
              className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              🗑 Delete All
            </button>
          </div>
        </div>
      </div>

      <div className={`${ui.card} overflow-hidden`}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default bg-surface-2">
              <th className="p-4 text-left">
                <button
                  type="button"
                  onClick={() => toggleSort("projectCode")}
                  className="inline-flex items-center font-semibold hover:text-accent"
                >
                  Project{sortIndicator("projectCode")}
                </button>
              </th>
              <th className="p-4 text-left">
                <button
                  type="button"
                  onClick={() => toggleSort("customerName")}
                  className="inline-flex items-center font-semibold hover:text-accent"
                >
                  Customer{sortIndicator("customerName")}
                </button>
              </th>
              <th className="p-4 text-left">Service</th>
              <th className="p-4 text-left">
                <button
                  type="button"
                  onClick={() => toggleSort("status")}
                  className="inline-flex items-center font-semibold hover:text-accent"
                >
                  Status{sortIndicator("status")}
                </button>
              </th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {pagedProjects.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-14 text-center text-ink-muted">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">📭</span>
                    <span>No Projects Found</span>
                    {(search || statusFilter !== "all") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setStatusFilter("all");
                        }}
                        className="mt-1 text-sm font-medium text-accent hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pagedProjects.map((project) => (
                <tr
                  key={project._id}
                  className="border-t border-border-default hover:bg-surface-2"
                >
                  <td className="p-4">
                    <Link
                      href={`/dashboard/projects/${project._id}`}
                      className="font-semibold text-accent hover:underline"
                    >
                      {project.projectCode}
                    </Link>
                  </td>

                  <td className="p-4">
                    <div className="font-medium">{project.customerName}</div>
                    <div className="text-xs text-ink-muted">
                      {project.customerPhone}
                    </div>
                  </td>

                  <td className="p-4">
                    {SERVICE_TYPE_LABELS[project.serviceType]}
                  </td>

                  <td className="p-4">
                    <span className="inline-flex items-center gap-2 rounded-full border border-border-default px-3 py-1 text-sm">
                      <span
                        className={`h-2 w-2 rounded-full ${STATUS_DOT[project.status]}`}
                      />
                      {STATUS_LABELS[project.status]}
                    </span>
                  </td>

                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmTarget({
                          type: "single",
                          id: project._id,
                          label: project.projectCode,
                        })
                      }
                      disabled={deletingRowId === project._id}
                      className="rounded-lg bg-red-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingRowId === project._id ? "Deleting…" : "🗑 Delete"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {filteredProjects.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border-default p-4 sm:flex-row">
            <span className="text-sm text-ink-muted">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filteredProjects.length)} of{" "}
              {filteredProjects.length}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={ui.btnGhostSm}
              >
                ← Prev
              </button>
              <span className="px-2 text-sm text-ink-muted">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={ui.btnGhostSm}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={(project) => {
            setShowModal(false);
            setProjects((prev) => [project, ...prev]);
            setToast({ kind: "success", text: "Project created." });
          }}
        />
      )}

      {confirmTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
          onClick={() => !isDeleting && setConfirmTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`${ui.card} w-full max-w-sm p-6 shadow-2xl`}
          >
            <h2 id="confirm-delete-title" className="text-lg font-semibold">
              {confirmTarget.type === "all"
                ? "Delete all projects?"
                : "Delete this project?"}
            </h2>

            <p className="mt-2 text-sm text-ink-muted">
              {confirmTarget.type === "all"
                ? "This will permanently delete ALL testing projects. This action cannot be undone."
                : `This will permanently delete project ${confirmTarget.label}. This action cannot be undone.`}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmTarget(null)}
                disabled={isDeleting}
                className={ui.btnGhost}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
