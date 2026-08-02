import { cookies } from "next/headers";
import Link from "next/link";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { Job, JobStatus, SERVICE_TYPE_LABELS } from "@/types/job";
import { ui } from "@/lib/ui-classes";
import { DutyToggle } from "@/components/DutyToggle";

const STATUS_LABELS: Record<JobStatus, string> = {
  [JobStatus.NEW]: "New",
  [JobStatus.ASSIGNED]: "Assigned",
  [JobStatus.EN_ROUTE]: "En Route",
  [JobStatus.IN_PROGRESS]: "In Progress",
  [JobStatus.COMPLETED]: "Completed",
  [JobStatus.CANCELLED]: "Cancelled",
};

const STATUS_COLORS: Record<JobStatus, string> = {
  [JobStatus.NEW]: "text-ink-muted",
  [JobStatus.ASSIGNED]: "text-warning",
  [JobStatus.EN_ROUTE]: "text-accent",
  [JobStatus.IN_PROGRESS]: "text-accent",
  [JobStatus.COMPLETED]: "text-success",
  [JobStatus.CANCELLED]: "text-danger",
};

function JobCard({ job }: { job: Job }) {
  return (
    <Link href={`/jobs/${job._id}`} className={`${ui.card} block p-4 active:border-accent`}>
      <div className="mb-1.5 flex items-start justify-between gap-3">
        <p className="font-semibold">{job.customerName}</p>
        <span className={`shrink-0 text-xs font-semibold ${STATUS_COLORS[job.status]}`}>
          {STATUS_LABELS[job.status]}
        </span>
      </div>
      <p className="mb-1 text-sm text-ink-muted">{SERVICE_TYPE_LABELS[job.serviceType]}</p>
      <p className="mb-2 text-sm text-ink-faint">{job.address}</p>
      {job.scheduledDate && (
        <p className="font-mono text-xs text-ink-muted">
          {new Date(job.scheduledDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            timeZone: "Asia/Kolkata",
          })}
          {job.scheduledTimeSlot ? `, ${job.scheduledTimeSlot}` : ""}
        </p>
      )}
    </Link>
  );
}

/**
 * No client-side filtering by technician id happens here, because
 * none is needed: /api/jobs proxies straight to the backend's
 * GET /projects, which already scopes the result set to the
 * caller's own assigned jobs from the verified JWT when the role
 * is technician (Module 2's project.service.ts). This page could
 * not show another technician's job even if it tried to.
 */
export default async function JobsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  let jobs: Job[] = [];
  let loadError: string | null = null;

  try {
    const data = await backendFetch<{ projects: Job[] }>("/projects", { accessToken });
    jobs = data.projects;
  } catch (err) {
    loadError = err instanceof BackendApiError ? err.message : "Could not load your jobs.";
  }

  const activeJobs = jobs.filter((j) => j.status !== JobStatus.COMPLETED && j.status !== JobStatus.CANCELLED);
  const pastJobs = jobs.filter((j) => j.status === JobStatus.COMPLETED || j.status === JobStatus.CANCELLED);

  return (
    <div className="flex flex-col gap-5">
      <DutyToggle />

      <div>
        <h1 className="mb-3 text-lg font-semibold">Today&apos;s Jobs</h1>

        {loadError && <p className={`${ui.errorText} mb-3`}>{loadError}</p>}

        {!loadError && activeJobs.length === 0 && (
          <div className={`${ui.card} p-6 text-center text-sm text-ink-faint`}>
            No active jobs assigned right now.
          </div>
        )}

        <div className="flex flex-col gap-3">
          {activeJobs.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      </div>

      {pastJobs.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink-muted">Completed</h2>
          <div className="flex flex-col gap-3">
            {pastJobs.map((job) => (
              <JobCard key={job._id} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
