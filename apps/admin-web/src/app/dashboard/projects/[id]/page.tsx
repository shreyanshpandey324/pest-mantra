import Link from "next/link";
import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { Project, STATUS_LABELS, SERVICE_TYPE_LABELS, ProjectStatusHistoryEntry } from "@/types/project";
import { ProjectWithAssignedTechnicians } from "@/types/tracking";
import { ui } from "@/lib/ui-classes";

interface ProjectDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailsPage({ params }: ProjectDetailsPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  let project: (Project & ProjectWithAssignedTechnicians) | null = null;
  let history: ProjectStatusHistoryEntry[] = [];
  let loadError: string | null = null;

  try {
    const [projectData, historyData] = await Promise.all([
      backendFetch<{ project: Project & ProjectWithAssignedTechnicians }>(`/projects/${id}`, {
        accessToken,
      }),
      backendFetch<{ history: ProjectStatusHistoryEntry[] }>(`/projects/${id}/history`, {
        accessToken,
      }),
    ]);
    project = projectData.project;
    history = historyData.history;
  } catch (err) {
    loadError = err instanceof BackendApiError ? err.message : "Could not load this project.";
  }

  if (loadError || !project) {
    return (
      <div>
        <Link href="/dashboard/projects" className="mb-5 inline-block text-sm text-ink-muted hover:underline">
          ← Back to Projects
        </Link>
        <div className="rounded-2xl border border-danger/40 bg-surface px-[18px] py-3.5 text-[13px] text-danger">
          {loadError ?? "Project not found."}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link href="/dashboard/projects" className="mb-5 inline-block text-sm text-ink-muted hover:underline">
        ← Back to Projects
      </Link>

      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-[22px]">{project.customerName}</h1>
          <p className="font-mono text-xs text-ink-faint">{project.projectCode}</p>
        </div>
        <span className={ui.badge}>{STATUS_LABELS[project.status]}</span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className={`${ui.card} p-6 lg:col-span-2`}>
          <h2 className="mb-4 text-base font-semibold">Details</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="mb-1 text-xs text-ink-muted">Phone</dt>
              <dd className="font-mono">{project.customerPhone}</dd>
            </div>
            <div>
              <dt className="mb-1 text-xs text-ink-muted">Service type</dt>
              <dd>{SERVICE_TYPE_LABELS[project.serviceType]}</dd>
            </div>
            <div className="col-span-2">
              <dt className="mb-1 text-xs text-ink-muted">Address</dt>
              <dd>{project.address}</dd>
            </div>
            <div>
              <dt className="mb-1 text-xs text-ink-muted">Scheduled</dt>
              <dd>
                {project.scheduledDate
                  ? `${new Date(project.scheduledDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}${project.scheduledTimeSlot ? `, ${project.scheduledTimeSlot}` : ""}`
                  : "Not yet scheduled"}
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-xs text-ink-muted">Payment method</dt>
              <dd>{project.paymentMethod ?? "—"}</dd>
            </div>
            {project.notes && (
              <div className="col-span-2">
                <dt className="mb-1 text-xs text-ink-muted">Notes</dt>
                <dd>{project.notes}</dd>
              </div>
            )}
            {project.assignedTechnicians && project.assignedTechnicians.length > 0 && (
              <div className="col-span-2">
                <dt className="mb-1 text-xs text-ink-muted">
                  Assigned technicians{" "}
                  <span className="text-ink-faint">(multi-technician field — unverified shape)</span>
                </dt>
                <dd className="flex flex-wrap gap-1.5">
                  {project.assignedTechnicians.map((techId) => (
                    <span key={techId} className={`${ui.badge} font-mono`}>
                      {techId}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className={`${ui.card} p-6`}>
          <h2 className="mb-4 text-base font-semibold">Status History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-ink-faint">No history yet.</p>
          ) : (
            <ol className="flex flex-col gap-4">
              {history.map((entry) => (
                <li key={entry._id} className="border-l-2 border-border-strong pl-3">
                  <p className="text-sm font-medium">
                    {entry.fromStatus ? `${STATUS_LABELS[entry.fromStatus]} → ` : ""}
                    {STATUS_LABELS[entry.toStatus]}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {new Date(entry.changedAt).toLocaleString("en-IN")}
                  </p>
                  {entry.remarks && <p className="mt-1 text-xs text-ink-muted">{entry.remarks}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
