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

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[22px]">Projects</h1>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href="/dashboard/projects"
          className={`${ui.badge} ${!statusFilter ? "border-accent text-accent" : ""}`}
        >
          All
        </Link>
        {Object.values(ProjectStatus).map((status) => (
          <Link
            key={status}
            href={`/dashboard/projects?status=${status}`}
            className={`${ui.badge} ${statusFilter === status ? "border-accent text-accent" : ""}`}
          >
            {STATUS_LABELS[status]}
          </Link>
        ))}
      </div>

      {loadError && (
        <div className="mb-5 rounded-2xl border border-danger/40 bg-surface px-[18px] py-3.5 text-[13px] text-danger">
          {loadError}
        </div>
      )}

      <div className={`${ui.card} overflow-hidden`}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-default text-left text-xs text-ink-muted">
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
                <td colSpan={5} className="px-5 py-10 text-center text-ink-faint">
                  No projects found.
                </td>
              </tr>
            )}
            {projects.map((project) => (
              <tr key={project._id} className="border-b border-border-default last:border-b-0 hover:bg-surface-2/50">
                <td className="px-5 py-3.5">
                  <Link href={`/dashboard/projects/${project._id}`} className="font-mono text-xs hover:underline">
                    {project.projectCode}
                  </Link>
                </td>
                <td className="px-5 py-3.5 font-medium">{project.customerName}</td>
                <td className="px-5 py-3.5 text-ink-muted">{SERVICE_TYPE_LABELS[project.serviceType]}</td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-2">
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
  );
}
