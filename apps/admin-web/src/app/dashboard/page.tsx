import Link from "next/link";
import { cookies } from "next/headers";

import {
  backendFetch,
  BackendApiError,
} from "@/lib/backend-client";

import { ACCESS_COOKIE_NAME } from "@/lib/session";

import {
  Project,
  ProjectStatus,
  STATUS_LABELS,
  SERVICE_TYPE_LABELS,
} from "@/types/project";

import {
  AuthUser,
  UserRole,
} from "@/types/auth";

import { LiveBoard } from "@/components/LiveBoard";
import { ui } from "@/lib/ui-classes";
import { getCurrentUser } from "@/lib/current-user";

interface QuickAction {
  href: string;
  label: string;
  description: string;
  icon: string;
}

const STATUS_DOT: Record<ProjectStatus, string> = {
  [ProjectStatus.NEW]:
    "bg-ink-muted",

  [ProjectStatus.ASSIGNED]:
    "bg-warning",

  [ProjectStatus.EN_ROUTE]:
    "bg-accent",

  [ProjectStatus.IN_PROGRESS]:
    "bg-accent",

  [ProjectStatus.COMPLETED]:
    "bg-success",

  [ProjectStatus.CANCELLED]:
    "bg-danger",
};

function formatRelativeTime(
  iso: string
): string {
  const date = new Date(iso);

  const diffMs =
    Date.now() - date.getTime();

  const diffMinutes =
    Math.round(diffMs / 60000);

  if (diffMinutes < 1) {
    return "just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours =
    Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays =
    Math.round(diffHours / 24);

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      timeZone: "Asia/Kolkata",
    }
  );
}

function getQuickActions(
  user: AuthUser
): QuickAction[] {
  const common: QuickAction[] = [
    {
      href: "/dashboard/projects",
      label: "Projects",
      description:
        "View and manage service jobs",
      icon: "📋",
    },

    {
      href: "/dashboard/technicians",
      label: "Technicians",
      description:
        "Team and duty status",
      icon: "🧑‍🔧",
    },

    {
      href: "/dashboard/tracking",
      label: "Live Tracking",
      description:
        "Real-time field locations",
      icon: "📍",
    },

    {
      href: "/dashboard/mileage",
      label: "Mileage",
      description:
        "Duty and distance logs",
      icon: "⛽",
    },

    {
      href: "/dashboard/inventory",
      label: "Inventory",
      description:
        "Chemicals and stock",
      icon: "📦",
    },

    {
      href: "/dashboard/reports",
      label: "Reports",
      description:
        "Operational reports",
      icon: "📊",
    },

    {
      href: "/dashboard/settings",
      label: "Settings",
      description:
        "Account and system settings",
      icon: "⚙️",
    },
  ];

  if (
    user.role ===
    UserRole.SUPER_ADMIN
  ) {
    return [
      {
        href: "/dashboard/companies",
        label: "Companies",
        description:
          "Companies and branches",
        icon: "🏢",
      },
      ...common,
    ];
  }

  return common;
}

export default async function DashboardHomePage() {
  const user =
    await getCurrentUser();

  const isDeveloper =
    user.role ===
    UserRole.SUPER_ADMIN;

  const quickActions =
    getQuickActions(user);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent">
          {isDeveloper
            ? "Developer Console"
            : "Office Console"}
        </p>

        <h1 className="mt-1 text-[22px] font-semibold">
          {isDeveloper
            ? "System Dashboard"
            : "Office Dashboard"}
        </h1>

        <p className="mt-1 text-sm text-ink-muted">
          {isDeveloper
            ? "Global overview of Pest Mantra field operations."
            : "Overview of your office and branch operations."}
        </p>
      </header>

      {/* Scope */}
      <section
        className={`${ui.card} p-5`}
        aria-label="Account scope"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-faint">
              Current account
            </p>

            <p className="mt-1 text-lg font-semibold">
              {user.name}
            </p>

            <p className="mt-1 text-sm text-ink-muted">
              {user.phone}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs uppercase tracking-wide text-ink-faint">
              Access level
            </p>

            <p className="mt-1 text-sm font-semibold text-accent">
              {isDeveloper
                ? "Developer / Super Admin"
                : "Office Admin"}
            </p>

            <p className="mt-1 text-xs text-ink-faint">
              {isDeveloper
                ? "Global system scope"
                : user.branchId
                  ? "Branch-scoped account"
                  : "Office-scoped account"}
            </p>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Quick actions
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {quickActions.map(
            (action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`${ui.card} flex flex-col gap-1 p-4 transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:border-accent`}
              >
                <span
                  className="text-2xl"
                  aria-hidden="true"
                >
                  {action.icon}
                </span>

                <span className="text-sm font-semibold">
                  {action.label}
                </span>

                <span className="text-xs text-ink-muted">
                  {action.description}
                </span>
              </Link>
            )
          )}
        </div>
      </section>

      <DashboardData />
    </div>
  );
}

async function DashboardData() {
  const cookieStore =
    await cookies();

  const accessToken =
    cookieStore.get(
      ACCESS_COOKIE_NAME
    )?.value;

  let projects: Project[] = [];

  let loadError:
    | string
    | null = null;

  try {
    const data =
      await backendFetch<{
        projects: Project[];
      }>("/projects", {
        accessToken,
      });

    projects =
      data.projects ?? [];
  } catch (err) {
    loadError =
      err instanceof BackendApiError
        ? err.message
        : "Could not load projects.";
  }

  const completedProjects =
    projects.filter(
      (project) =>
        project.status ===
        ProjectStatus.COMPLETED
    ).length;

  const activeProjects =
    projects.filter(
      (project) =>
        project.status !==
          ProjectStatus.COMPLETED &&
        project.status !==
          ProjectStatus.CANCELLED
    ).length;

  const cancelledProjects =
    projects.filter(
      (project) =>
        project.status ===
        ProjectStatus.CANCELLED
    ).length;

  const recentActivity =
    [...projects]
      .sort(
        (a, b) =>
          new Date(
            b.updatedAt
          ).getTime() -
          new Date(
            a.updatedAt
          ).getTime()
      )
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

      {/* Real project statistics */}
      <section aria-label="Project statistics">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Project overview
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total projects"
            value={projects.length}
          />

          <StatCard
            label="Active projects"
            value={activeProjects}
          />

          <StatCard
            label="Completed projects"
            value={completedProjects}
          />

          <StatCard
            label="Cancelled projects"
            value={cancelledProjects}
          />
        </div>
      </section>

      {/* Recent activity */}
      <section aria-label="Recent activity">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Recent activity
        </h2>

        <div
          className={`${ui.card} overflow-hidden`}
        >
          {recentActivity.length ===
          0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span
                className="text-3xl"
                aria-hidden="true"
              >
                🕓
              </span>

              <p className="text-sm text-ink-muted">
                No project activity
                recorded yet.
              </p>

              <p className="text-xs text-ink-faint">
                This section uses real
                project records from the
                backend.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border-default">
              {recentActivity.map(
                (project) => (
                  <li
                    key={
                      project._id
                    }
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        STATUS_DOT[
                          project.status
                        ]
                      }`}
                      aria-hidden="true"
                    />

                    <Link
                      href={`/dashboard/projects/${project._id}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                    >
                      {
                        project.customerName
                      }{" "}
                      <span className="font-mono text-xs text-ink-faint">
                        {
                          project.projectCode
                        }
                      </span>
                    </Link>

                    <span className="hidden shrink-0 text-xs text-ink-muted sm:inline">
                      {
                        SERVICE_TYPE_LABELS[
                          project
                            .serviceType
                        ]
                      }
                    </span>

                    <span className="shrink-0 rounded-full border border-border-default px-2.5 py-1 text-xs text-ink-muted">
                      {
                        STATUS_LABELS[
                          project.status
                        ]
                      }
                    </span>

                    <span className="shrink-0 text-xs text-ink-faint">
                      {formatRelativeTime(
                        project.updatedAt
                      )}
                    </span>
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      </section>

      {/* Live board */}
      <section aria-label="Live job board">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Live board
        </h2>

        <LiveBoard
          initialProjects={
            projects
          }
        />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      className={`${ui.card} p-5`}
    >
      <p className="text-[13px] text-ink-muted">
        {label}
      </p>

      <p className="mt-2 font-mono text-3xl font-semibold">
        {value}
      </p>
    </div>
  );
}