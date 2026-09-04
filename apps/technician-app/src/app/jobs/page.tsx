import { cookies } from "next/headers";
import Link from "next/link";

import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { Job, JobStatus, SERVICE_TYPE_LABELS } from "@/types/job";
import { ui } from "@/lib/ui-classes";
import { DutyToggle } from "@/components/DutyToggle";
import { AssignmentPriorityAlerts } from "@/components/AssignmentPriorityAlerts";

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

function indiaDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

function displayDate(value?: string): string {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}


function geoDistanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earth = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(h));
}

function optimizeRoute(jobs: Job[]): { jobs: Job[]; approximateKm: number } {
  const geocoded = jobs.filter((job) => job.siteLocation);
  if (geocoded.length < 2) return { jobs: geocoded, approximateKm: 0 };
  const remaining = [...geocoded];
  const route: Job[] = [remaining.shift()!];
  let total = 0;
  while (remaining.length) {
    const current = route[route.length - 1].siteLocation!;
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    remaining.forEach((candidate, index) => {
      const distance = geoDistanceKm(current, candidate.siteLocation!);
      if (distance < bestDistance) { bestDistance = distance; best = index; }
    });
    total += bestDistance * 1.22;
    route.push(remaining.splice(best, 1)[0]);
  }
  return { jobs: route, approximateKm: total };
}

function JobCard({ job, attention = false }: { job: Job; attention?: boolean }) {
  const rawPhone = job.customerPhone.trim();
  const phoneDigits = rawPhone.replace(/\D/g, "");
  const callPhone = rawPhone.startsWith("+") ? `+${phoneDigits}` : phoneDigits.length === 10 ? `+91${phoneDigits}` : phoneDigits ? `+${phoneDigits}` : "";
  const mapsUrl = job.siteLocation ? `https://www.google.com/maps/search/?api=1&query=${job.siteLocation.latitude},${job.siteLocation.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`;

  return (
    <article className={`${ui.card} p-4 ${attention ? "border-warning/45" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">{job.projectCode}</p>
          <Link href={`/jobs/${job._id}`} className="mt-1 block truncate font-semibold text-ink hover:text-accent">
            {job.customerName}
          </Link>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1"><span className={`text-xs font-semibold ${STATUS_COLORS[job.status]}`}>{STATUS_LABELS[job.status]}</span>{job.priority && job.priority !== "normal" ? <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${job.priority === "urgent" ? "border-danger/40 text-danger" : "border-warning/40 text-warning"}`}>{job.priority === "urgent" ? "High" : "Medium"}</span> : null}</div>
      </div>

      <p className="mt-2 text-xs font-medium text-ink-muted">{SERVICE_TYPE_LABELS[job.serviceType]}</p>
      <p className="mt-1 text-sm leading-5 text-ink-muted">{job.address}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
        <span>{displayDate(job.scheduledDate)}</span>
        {job.scheduledTimeSlot ? <span>• {job.scheduledTimeSlot}</span> : null}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Link href={`/jobs/${job._id}`} className="flex h-10 items-center justify-center rounded-lg bg-accent px-2 text-xs font-semibold text-accent-ink">
          Open job
        </Link>
        {callPhone ? (
          <a href={`tel:${callPhone}`} className="flex h-10 items-center justify-center rounded-lg border border-border-default px-2 text-xs font-semibold text-ink-muted">
            Call
          </a>
        ) : (
          <span className="flex h-10 items-center justify-center rounded-lg border border-border-default px-2 text-xs text-ink-faint">No phone</span>
        )}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-10 items-center justify-center rounded-lg border border-border-default px-2 text-xs font-semibold text-ink-muted"
        >
          Navigate
        </a>
      </div>
    </article>
  );
}

function JobSection({
  title,
  subtitle,
  jobs,
  empty,
  attention = false,
}: {
  title: string;
  subtitle?: string;
  jobs: Job[];
  empty: string;
  attention?: boolean;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p> : null}
        </div>
        <span className="rounded-full border border-border-default px-2.5 py-1 font-mono text-[10px] text-ink-muted">{jobs.length}</span>
      </div>
      {jobs.length === 0 ? (
        <div className={`${ui.card} p-5 text-center text-sm text-ink-faint`}>{empty}</div>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => <JobCard key={job._id} job={job} attention={attention} />)}
        </div>
      )}
    </section>
  );
}

export default async function JobsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  let jobs: Job[] = [];
  let loadError: string | null = null;
  let eod: { assigned:number; completed:number; active:number; cancelled:number; failedVisits:number; rescheduleRequests:number; collectionsRecorded:number } | null = null;

  try {
    const [data, summaryData] = await Promise.all([
      backendFetch<{ projects: Job[] }>("/projects", { accessToken }),
      backendFetch<{ summary: { assigned:number; completed:number; active:number; cancelled:number; failedVisits:number; rescheduleRequests:number; collectionsRecorded:number } }>("/operations/end-of-day", { accessToken }).catch(() => null),
    ]);
    jobs = data.projects ?? [];
    eod = summaryData?.summary ?? null;
  } catch (err) {
    loadError = err instanceof BackendApiError ? err.message : "Could not load your jobs.";
  }

  const todayKey = indiaDateKey(new Date());
  const active = jobs.filter((job) => job.status !== JobStatus.COMPLETED && job.status !== JobStatus.CANCELLED);
  const todayJobs = active.filter((job) => job.scheduledDate && indiaDateKey(job.scheduledDate) === todayKey);
  const overdueJobs = active.filter((job) => job.scheduledDate && indiaDateKey(job.scheduledDate) < todayKey);
  const upcomingJobs = active
    .filter((job) => job.scheduledDate && indiaDateKey(job.scheduledDate) > todayKey)
    .sort((a, b) => new Date(a.scheduledDate ?? 0).getTime() - new Date(b.scheduledDate ?? 0).getTime());
  const unscheduledJobs = active.filter((job) => !job.scheduledDate);
  const completedJobs = jobs
    .filter((job) => job.status === JobStatus.COMPLETED)
    .sort((a, b) => new Date(b.completedAt ?? b.updatedAt).getTime() - new Date(a.completedAt ?? a.updatedAt).getTime())
    .slice(0, 8);
  const routePlan = optimizeRoute([...todayJobs, ...upcomingJobs].slice(0, 8));
  const priorityRank = { urgent: 0, high: 1, normal: 2 } as const;
  const nextBestJob = [...todayJobs, ...overdueJobs, ...upcomingJobs, ...unscheduledJobs].sort((a,b)=>{
    const pa = priorityRank[a.priority ?? "normal"]; const pb = priorityRank[b.priority ?? "normal"];
    if (pa !== pb) return pa-pb;
    const ta = a.scheduledDate ? new Date(a.scheduledDate).getTime() : Number.MAX_SAFE_INTEGER;
    const tb = b.scheduledDate ? new Date(b.scheduledDate).getTime() : Number.MAX_SAFE_INTEGER;
    return ta-tb;
  })[0];

  return (
    <div className="flex flex-col gap-6">
      <DutyToggle />
      <AssignmentPriorityAlerts jobs={active} />

      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">Field command</p>
        <h1 className="mt-1 text-xl font-semibold">My Jobs</h1>
        <p className="mt-1 text-sm text-ink-muted">Today first, then overdue and upcoming work.</p>
      </header>

      {loadError ? <p className={ui.errorText}>{loadError}</p> : null}

      {nextBestJob ? <section className="overflow-hidden rounded-2xl border border-accent/25 bg-surface shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">Next best job</p><h2 className="mt-2 text-xl font-semibold">{nextBestJob.customerName}</h2><p className="mt-1 text-sm text-ink-muted">{SERVICE_TYPE_LABELS[nextBestJob.serviceType]} • {nextBestJob.scheduledTimeSlot || "Flexible slot"}</p></div><span className="rounded-full border border-accent/20 bg-accent-soft px-2.5 py-1 text-[10px] font-bold uppercase text-accent-strong">{nextBestJob.priority || "normal"}</span></div><p className="mt-3 text-sm text-ink-muted">{nextBestJob.address}</p><div className="mt-4 grid grid-cols-3 gap-2"><Link href={`/jobs/${nextBestJob._id}`} className="flex h-11 items-center justify-center rounded-xl bg-accent text-xs font-bold text-accent-ink">Open</Link><a href={`tel:${nextBestJob.customerPhone}`} className="flex h-11 items-center justify-center rounded-xl border border-border-default text-xs font-semibold">Call</a><a target="_blank" rel="noreferrer" href={nextBestJob.siteLocation?`https://www.google.com/maps/search/?api=1&query=${nextBestJob.siteLocation.latitude},${nextBestJob.siteLocation.longitude}`:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextBestJob.address)}`} className="flex h-11 items-center justify-center rounded-xl border border-border-default text-xs font-semibold">Navigate</a></div></div>
      </section> : null}

      {eod ? <section className={`${ui.card} p-4`}><div className="flex items-center justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-accent">Today at a glance</p><p className="mt-1 text-sm text-ink-muted">Your automatic end-of-day summary builds as you work.</p></div><span className="text-sm font-semibold text-success">{eod.completed}/{eod.assigned} done</span></div><div className="mt-3 grid grid-cols-4 gap-2 text-center"><div><p className="text-lg font-semibold">{eod.active}</p><p className="text-[9px] text-ink-faint">Active</p></div><div><p className="text-lg font-semibold text-warning">{eod.failedVisits}</p><p className="text-[9px] text-ink-faint">Failed</p></div><div><p className="text-lg font-semibold">{eod.rescheduleRequests}</p><p className="text-[9px] text-ink-faint">Reschedule</p></div><div><p className="text-lg font-semibold text-success">{eod.collectionsRecorded}</p><p className="text-[9px] text-ink-faint">Collections</p></div></div></section> : null}

      {!loadError ? (
        <div className="grid grid-cols-4 gap-2">
          <div className={`${ui.card} p-3 text-center`}><p className="text-xl font-semibold text-accent">{todayJobs.length}</p><p className="mt-1 text-[10px] text-ink-faint">Today</p></div>
          <div className={`${ui.card} p-3 text-center`}><p className="text-xl font-semibold text-warning">{overdueJobs.length}</p><p className="mt-1 text-[10px] text-ink-faint">Overdue</p></div>
          <div className={`${ui.card} p-3 text-center`}><p className="text-xl font-semibold">{upcomingJobs.length}</p><p className="mt-1 text-[10px] text-ink-faint">Upcoming</p></div>
          <div className={`${ui.card} p-3 text-center`}><p className="text-xl font-semibold">{unscheduledJobs.length}</p><p className="mt-1 text-[10px] text-ink-faint">Unscheduled</p></div>
        </div>
      ) : null}

      {routePlan.jobs.length >= 2 ? (
        <section className={`${ui.card} overflow-hidden`}>
          <div className="border-b border-border-default bg-surface-2/70 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">Smart route</p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <div><h2 className="font-semibold">Suggested field sequence</h2><p className="mt-1 text-xs text-ink-muted">Nearest-neighbour route across geocoded jobs. Approximate road distance; live traffic requires a Maps provider.</p></div>
              <span className="shrink-0 text-sm font-semibold text-accent">~{routePlan.approximateKm.toFixed(1)} km</span>
            </div>
          </div>
          <div className="divide-y divide-border-default">
            {routePlan.jobs.map((job, index) => (
              <Link key={job._id} href={`/jobs/${job._id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/60">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/10 font-mono text-xs font-bold text-accent">{index + 1}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{job.customerName}</span><span className="mt-0.5 block truncate text-xs text-ink-muted">{job.address}</span></span>
                <span className="text-[10px] text-ink-faint">{job.scheduledTimeSlot || "Flexible"}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <Link href="/jobs/expenses" className={`${ui.card} flex items-center justify-between p-4 transition active:border-accent`}>
        <div>
          <p className="text-sm font-semibold text-ink">Expense Claims</p>
          <p className="mt-1 text-xs text-ink-muted">Submit fuel, travel and field receipts for approval.</p>
        </div>
        <span className="text-accent" aria-hidden="true">→</span>
      </Link>

      {!loadError ? (
        <>
          <JobSection title="Today" subtitle={new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" })} jobs={todayJobs} empty="No jobs scheduled for today." />
          {overdueJobs.length > 0 ? <JobSection title="Needs attention" subtitle="Scheduled before today and still active" jobs={overdueJobs} empty="No overdue jobs." attention /> : null}
          {unscheduledJobs.length > 0 ? <JobSection title="Assigned without schedule" jobs={unscheduledJobs} empty="No unscheduled jobs." attention /> : null}
          <JobSection title="Upcoming" subtitle="Future scheduled work" jobs={upcomingJobs.slice(0, 12)} empty="No upcoming jobs assigned yet." />
          {completedJobs.length > 0 ? <JobSection title="Recently completed" jobs={completedJobs} empty="No completed jobs yet." /> : null}
        </>
      ) : null}
    </div>
  );
}
