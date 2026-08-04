import Link from "next/link";
import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { Project, ProjectStatus, STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/types/project";
import { ui } from "@/lib/ui-classes";

interface ProjectListPageProps {
  searchParams: Promise<{ status?: string }>;
}

const STATUS_DOT: Record<ProjectStatus, string> = {
  [ProjectStatus.NEW]: "bg-ink-muted",
  [ProjectStatus.ASSIGNED]: "bg-warning",
  [ProjectStatus.EN_ROUTE]: "bg-accent",
  [ProjectStatus.IN_PROGRESS]: "bg-accent",
  [ProjectStatus.COMPLETED]: "bg-success",
  [ProjectStatus.CANCELLED]: "bg-danger",
};

const btnSecondary =
  "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg text-sm font-semibold border border-border-default bg-surface text-ink-muted hover:bg-surface-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

function isProjectStatus(value: string | undefined): value is ProjectStatus {
  return !!value && Object.values(ProjectStatus).includes(value as ProjectStatus);
}

export default async function ProjectListPage({ searchParams }: ProjectListPageProps) {
  const params = await searchParams;
  const statusFilter = isProjectStatus(params.status) ? params.status : undefined;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  let projects: Project[] = [];
  let loadError: string | null = null;

  try {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    const data = await backendFetch<{ projects: Project[] }>(`/projects${query}`, { accessToken });
    projects = data.projects;
  } catch (err) {
    loadError = err instanceof BackendApiError ? err.message : "Could not load projects.";
  }

  const totalCount = projects.length;
  const pendingCount = projects.filter(
    (project) => project.status !== ProjectStatus.COMPLETED && project.status !== ProjectStatus.CANCELLED
  ).length;
  const completedCount = projects.filter((project) => project.status === ProjectStatus.COMPLETED).length;
  const activeFilterLabel = statusFilter ? STATUS_LABELS[statusFilter] : "All jobs";

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-border-default/70 bg-gradient-to-br from-surface via-surface-2 to-surface p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
              Operations workspace
            </p>
            <h1 className="text-[26px] font-semibold tracking-tight text-ink">Projects</h1>
            <p className="mt-2 max-w-2xl text-sm text-ink-muted">
              Review new bookings, active assignments, and completed jobs in a clearer executive view.
            </p>
          </div>

          <div className="rounded-2xl border border-border-default/70 bg-surface px-4 py-3 text-sm text-ink-muted">
            <p className="font-medium text-ink">Current view</p>
            <p className="mt-1 font-mono text-xs text-ink-faint">{activeFilterLabel}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border-default/70 bg-surface/80 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-ink-faint">Total jobs</p>
            <p className="mt-2 font-mono text-[24px] font-semibold text-ink">{totalCount}</p>
          </div>
          <div className="rounded-2xl border border-border-default/70 bg-surface/80 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-ink-faint">Pending</p>
            <p className="mt-2 font-mono text-[24px] font-semibold text-ink">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border border-border-default/70 bg-surface/80 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-ink-faint">Completed</p>
            <p className="mt-2 font-mono text-[24px] font-semibold text-ink">{completedCount}</p>
          </div>
        </div>
      </div><div className={`${ui.card} p-5`}>
  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

    <div className="flex-1">
      <input
        type="text"
        placeholder="🔍 Search by Project Code, Customer, Phone..."
        className="w-full rounded-xl border border-border-default bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
      />
    </div>

    <div className="flex flex-wrap gap-3">

      <button className={btnSecondary}>
        📅 Today
      </button>

      <button className={btnSecondary}>
        📆 This Week
      </button>

      <button className={btnSecondary}>
        ⬇ Export
      </button>

      <button className={ui.btnPrimary}>
        ➕ New Project
      </button>

    </div>

  </div>
</div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/projects"
          className={`${ui.badge} ${!statusFilter ? "border-accent text-accent" : "border-border-default bg-surface text-ink-muted"}`}
        >
          All
        </Link>
        {Object.values(ProjectStatus).map((status) => (
          <Link
            key={status}
            href={`/dashboard/projects?status=${status}`}
            className={`${ui.badge} ${statusFilter === status ? "border-accent text-accent" : "border-border-default bg-surface text-ink-muted"}`}
          >
            {STATUS_LABELS[status]}
          </Link>
        ))}
      </div>

      {loadError && (
        <div className="rounded-2xl border border-danger/40 bg-surface px-[18px] py-3.5 text-[13px] text-danger">
          {loadError}
        </div>
      )}

      <div className={`${ui.card} overflow-hidden border border-border-default/70`}>
        <div className="flex items-center justify-between border-b border-border-default bg-surface-2/60 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">Project pipeline</h2>
            <p className="text-xs text-ink-faint">Sorted by scheduled date and latest activity</p>
          </div>
          <div className="rounded-full border border-border-default bg-surface px-3 py-1 text-[11px] font-medium text-ink-muted">
            {projects.length} jobs
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-default bg-surface-2/40 text-left text-xs uppercase tracking-[0.22em] text-ink-faint">
                <th className="px-5 py-3.5 font-medium">Code</th>
                <th className="px-5 py-3.5 font-medium">Customer</th>
                <th className="px-5 py-3.5 font-medium">Service</th>
                <th className="px-5 py-3.5 font-medium">Status</th>
                <th className="px-5 py-3.5 font-medium">Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 && !loadError && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-ink-faint">
                    No projects found.
                  </td>
                </tr>
              )}
              {projects.map((project) => (
                <tr key={project._id} className="border-b border-border-default last:border-b-0 bg-surface/40 transition-colors hover:bg-surface-2/70">
                  <td className="px-5 py-3.5">
                    <Link href={`/dashboard/projects/${project._id}`} className="font-mono text-xs font-semibold text-accent hover:underline">
                      {project.projectCode}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-ink">{project.customerName}</div>
                    <div className="mt-1 text-xs text-ink-faint">Open details</div>
                  </td>
                  <td className="px-5 py-3.5 text-ink-muted">{SERVICE_TYPE_LABELS[project.serviceType]}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface px-2.5 py-1.5 text-sm text-ink">
                      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[project.status]}`} aria-hidden="true" />
                      {STATUS_LABELS[project.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-ink-muted">
                    {project.scheduledDate
                      ? new Date(project.scheduledDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
