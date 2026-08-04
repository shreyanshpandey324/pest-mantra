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

  const statusCardClass =
    project.status === "completed"
      ? "border-success/30 bg-success/10 text-success"
      : project.status === "cancelled"
        ? "border-danger/30 bg-danger/10 text-danger"
        : "border-accent/30 bg-accent/10 text-accent";

  const scheduledLabel = project.scheduledDate
    ? `${new Date(project.scheduledDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}${project.scheduledTimeSlot ? `, ${project.scheduledTimeSlot}` : ""}`
    : "Not yet scheduled";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link href="/dashboard/projects" className="mb-3 inline-flex items-center text-sm text-ink-muted hover:underline">
            ← Back to Projects
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[26px] font-semibold tracking-tight text-ink">{project.customerName}</h1>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${statusCardClass}`}>
              {STATUS_LABELS[project.status]}
            </span>
          </div>
          <p className="mt-2 font-mono text-xs text-ink-faint">{project.projectCode}</p>
        </div>
        <div className="rounded-2xl border border-border-default/70 bg-surface px-4 py-3 text-sm text-ink-muted">
          <p className="font-medium text-ink">Service request</p>
          <p className="mt-1 font-mono text-xs text-ink-faint">{SERVICE_TYPE_LABELS[project.serviceType]}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-border-default/70 bg-gradient-to-br from-surface via-surface-2 to-surface p-5 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-ink-faint">Status</p>
          <p className="mt-3 text-[24px] font-semibold text-ink">{STATUS_LABELS[project.status]}</p>
          <p className="mt-2 text-sm text-ink-muted">Track this request from intake to completion.</p>
        </div>
        <div className="rounded-[24px] border border-border-default/70 bg-gradient-to-br from-surface via-surface-2 to-surface p-5 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-ink-faint">Scheduled</p>
          <p className="mt-3 text-[24px] font-semibold text-ink">{scheduledLabel}</p>
          <p className="mt-2 text-sm text-ink-muted">{project.scheduledTimeSlot ? `Time slot: ${project.scheduledTimeSlot}` : "No time slot specified"}</p>
        </div>
        <div className="rounded-[24px] border border-border-default/70 bg-gradient-to-br from-surface via-surface-2 to-surface p-5 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-ink-faint">Payment</p>
          <p className="mt-3 text-[24px] font-semibold text-ink">{project.paymentMethod ?? "—"}</p>
          <p className="mt-2 text-sm text-ink-muted">Collected via the current workflow.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className={`${ui.card} overflow-hidden border border-border-default/70`}>
            <div className="border-b border-border-default bg-surface-2/60 px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">Customer & service overview</h2>
              <p className="mt-1 text-xs text-ink-faint">Core booking details and service context.</p>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <div className="rounded-2xl border border-border-default/70 bg-surface p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-ink-faint">Customer</p>
                <p className="mt-2 font-semibold text-ink">{project.customerName}</p>
                <p className="mt-2 font-mono text-sm text-ink-muted">{project.customerPhone}</p>
              </div>
              <div className="rounded-2xl border border-border-default/70 bg-surface p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-ink-faint">Service type</p>
                <p className="mt-2 font-semibold text-ink">{SERVICE_TYPE_LABELS[project.serviceType]}</p>
                <p className="mt-2 text-sm text-ink-muted">Service request logged in the operations workspace.</p>
              </div>
              <div className="rounded-2xl border border-border-default/70 bg-surface p-4 md:col-span-2">
                <p className="text-[11px] uppercase tracking-[0.24em] text-ink-faint">Address</p>
                <p className="mt-2 font-medium text-ink">{project.address}</p>
              </div>
              {project.notes && (
                <div className="rounded-2xl border border-border-default/70 bg-surface p-4 md:col-span-2">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-ink-faint">Notes</p>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{project.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className={`${ui.card} overflow-hidden border border-border-default/70`}>
            <div className="border-b border-border-default bg-surface-2/60 px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">Assigned technician</h2>
              <p className="mt-1 text-xs text-ink-faint">Current operations ownership for this job.</p>
            </div>
            <div className="p-5">
              {project.assignedTechnicians && project.assignedTechnicians.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {project.assignedTechnicians.map((techId) => (
                    <span key={techId} className={`${ui.badge} font-mono text-xs`}>
                      {techId}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-muted">No technician has been assigned yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className={`${ui.card} overflow-hidden border border-border-default/70`}>
          <div className="border-b border-border-default bg-surface-2/60 px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Activity timeline</h2>
            <p className="mt-1 text-xs text-ink-faint">Operational history for this project.</p>
          </div>
          <div className="p-5">
            {history.length === 0 ? (
              <p className="text-sm text-ink-faint">No history yet.</p>
            ) : (
              <ol className="flex flex-col gap-4">
                {history.map((entry) => (
                  <li key={entry._id} className="flex gap-3 rounded-2xl border border-border-default/70 bg-surface p-3">
                    <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">
                        {entry.fromStatus ? `${STATUS_LABELS[entry.fromStatus]} → ` : ""}
                        {STATUS_LABELS[entry.toStatus]}
                      </p>
                      <p className="mt-1 text-xs text-ink-faint">
                        {new Date(entry.changedAt).toLocaleString("en-IN")}
                      </p>
                      {entry.remarks && <p className="mt-2 text-xs leading-5 text-ink-muted">{entry.remarks}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
