import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { Project, ProjectStatus, STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/types/project";
import { LiveBoard } from "@/components/LiveBoard";
import { ui } from "@/lib/ui-classes";

interface QuickAction {
  href: string;
  label: string;
  description: string;
  icon: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { href: "/dashboard/projects", label: "Projects", description: "View & manage all jobs", icon: "📋" },
  { href: "/dashboard/technicians", label: "Technicians", description: "Team & duty status", icon: "🧑‍🔧" },
  { href: "/dashboard/tracking", label: "Live Tracking", description: "Real-time field locations", icon: "📍" },
  { href: "/dashboard/mileage", label: "Mileage", description: "Duty & distance logs", icon: "⛽" },
  { href: "/dashboard/reports", label: "Reports", description: "Operational reports", icon: "📊" },
  { href: "/dashboard/complaints", label: "Complaints", description: "Customer complaints", icon: "📮" },
  { href: "/dashboard/inventory", label: "Inventory", description: "Stock & equipment", icon: "📦" },
  { href: "/dashboard/settings", label: "Settings", description: "Office & account settings", icon: "⚙️" },
];

const STATUS_DOT: Record<ProjectStatus, string> = {
  [ProjectStatus.NEW]: "bg-ink-muted",
  [ProjectStatus.ASSIGNED]: "bg-warning",
  [ProjectStatus.EN_ROUTE]: "bg-accent",
  [ProjectStatus.IN_PROGRESS]: "bg-accent",
  [ProjectStatus.COMPLETED]: "bg-success",
  [ProjectStatus.CANCELLED]: "bg-danger",
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

export default function DashboardHomePage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-[22px] font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Live overview of field operations across Pest Mantra.
        </p>
      </header>

      <section aria-label="Quick actions">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`${ui.card} flex flex-col gap-1 p-4 transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:border-accent`}
            >
              <span className="text-2xl" aria-hidden="true">
                {action.icon}
              </span>
              <span className="text-sm font-semibold">{action.label}</span>
              <span className="text-xs text-ink-muted">{action.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <Suspense fallback={<DashboardDataSkeleton />}>
        <DashboardData />
      </Suspense>
    </div>
  );
}

/**
 * Initial project list is fetched server-side (fast first paint,
 * no loading spinner on load) using the same access-token cookie
 * the rest of the dashboard relies on. All *interactions* after
 * that (create, assign) happen client-side in LiveBoard, which is
 * the simplest split that still avoids a full-page reload on every
 * action. This is split into its own component (instead of living
 * directly in the page) so it can stream in behind a Suspense
 * boundary while the static shell above (header, quick actions)
 * paints immediately.
 */
async function DashboardData() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  let projects: Project[] = [];
  let loadError: string | null = null;

  try {
    const data = await backendFetch<{ projects: Project[] }>("/projects", { accessToken });
    projects = data.projects;
  } catch (err) {
    loadError = err instanceof BackendApiError ? err.message : "Could not load projects.";
  }

  const recentActivity = [...projects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-8">
      {loadError && (
        <div
          role="alert"
          className="rounded-2xl border border-danger/40 bg-surface px-[18px] py-3.5 text-[13px] text-danger"
        >
          ⚠ {loadError}
        </div>
      )}

      <section aria-label="Recent activity">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Recent activity
        </h2>

        <div className={`${ui.card} overflow-hidden`}>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="text-3xl" aria-hidden="true">
                🕓
              </span>
              <p className="text-sm text-ink-muted">No recent activity yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border-default">
              {recentActivity.map((project) => (
                <li key={project._id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[project.status]}`}
                    aria-hidden="true"
                  />

                  <Link
                    href={`/dashboard/projects/${project._id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                  >
                    {project.customerName}{" "}
                    <span className="font-mono text-xs text-ink-faint">
                      {project.projectCode}
                    </span>
                  </Link>

                  <span className="hidden shrink-0 text-xs text-ink-muted sm:inline">
                    {SERVICE_TYPE_LABELS[project.serviceType]}
                  </span>

                  <span className="shrink-0 rounded-full border border-border-default px-2.5 py-1 text-xs text-ink-muted">
                    {STATUS_LABELS[project.status]}
                  </span>

                  <span className="shrink-0 text-xs text-ink-faint">
                    {formatRelativeTime(project.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-label="Live job board">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Live board
        </h2>
        <LiveBoard initialProjects={projects} />
      </section>
    </div>
  );
}

function DashboardDataSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-hidden="true">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`${ui.card} h-[84px] animate-pulse bg-surface-2`} />
        ))}
      </div>

      <div className={`${ui.card} h-[220px] animate-pulse bg-surface-2`} />

      <div className="grid grid-cols-[repeat(5,minmax(240px,1fr))] gap-4 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`${ui.card} h-[320px] animate-pulse bg-surface-2`} />
        ))}
      </div>
    </div>
  );
}
