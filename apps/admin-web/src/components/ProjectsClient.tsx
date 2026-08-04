"use client";

import { useMemo, useState } from "react";
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

const STATUS_DOT: Record<ProjectStatus, string> = {
  [ProjectStatus.NEW]: "bg-ink-muted",
  [ProjectStatus.ASSIGNED]: "bg-warning",
  [ProjectStatus.EN_ROUTE]: "bg-accent",
  [ProjectStatus.IN_PROGRESS]: "bg-accent",
  [ProjectStatus.COMPLETED]: "bg-success",
  [ProjectStatus.CANCELLED]: "bg-danger",
};

export default function ProjectsClient({ projects }: Props) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filteredProjects = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    if (!keyword) return projects;

    return projects.filter((project) => {
      return (
        project.projectCode.toLowerCase().includes(keyword) ||
        project.customerName.toLowerCase().includes(keyword) ||
        (project.customerPhone ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [projects, search]);

  return (
    <>
      <div className={`${ui.card} p-5 mb-6`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search by Project Code, Customer or Phone..."
            className="flex-1 rounded-xl border border-border-default bg-surface px-4 py-3 outline-none focus:border-accent"
          />

          <button
            type="button"
            className={ui.btnPrimary}
            onClick={() => setShowModal(true)}
          >
            ➕ New Project
          </button>
        </div>
      </div>

      <div className={`${ui.card} overflow-hidden`}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default bg-surface-2">
              <th className="p-4 text-left">Project</th>
              <th className="p-4 text-left">Customer</th>
              <th className="p-4 text-left">Service</th>
              <th className="p-4 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {filteredProjects.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-10 text-center text-ink-muted"
                >
                  No Projects Found
                </td>
              </tr>
            ) : (
              filteredProjects.map((project) => (
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
                    <div className="font-medium">
                      {project.customerName}
                    </div>

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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}