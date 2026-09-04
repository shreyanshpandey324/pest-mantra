"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthUser, UserRole, USER_ROLE_LABELS } from "@/types/auth";

interface SidebarProps {
  user: AuthUser;
}

interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

interface NavGroup {
  label: string;
  icon: string;
  roles: UserRole[];
  items: NavItem[];
}

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN];

const GROUPS: NavGroup[] = [
  {
    label: "Operations",
    icon: "⌘",
    roles: ADMIN_ROLES,
    items: [
      { label: "Control Center", href: "/dashboard/control-center", icon: "▦", roles: ADMIN_ROLES },
      { label: "Exception Inbox", href: "/dashboard/exception-inbox", icon: "!", roles: ADMIN_ROLES },
      { label: "Projects / Jobs", href: "/dashboard/projects", icon: "◆", roles: ADMIN_ROLES },
      { label: "Technicians", href: "/dashboard/technicians", icon: "◉", roles: ADMIN_ROLES },
      { label: "Live Tracking", href: "/dashboard/tracking", icon: "⌖", roles: ADMIN_ROLES },
      { label: "Mileage", href: "/dashboard/mileage", icon: "↝", roles: ADMIN_ROLES },
    ],
  },
  {
    label: "Customers",
    icon: "◎",
    roles: ADMIN_ROLES,
    items: [
      { label: "Customer 360", href: "/dashboard/customers", icon: "◍", roles: ADMIN_ROLES },
      { label: "Customer Master", href: "/dashboard/customer-master", icon: "+", roles: ADMIN_ROLES },
      { label: "Complaints", href: "/dashboard/complaints", icon: "!", roles: ADMIN_ROLES },
      { label: "Service Reminders", href: "/dashboard/service-reminders", icon: "◷", roles: ADMIN_ROLES },
    ],
  },
  {
    label: "Sales",
    icon: "↗",
    roles: ADMIN_ROLES,
    items: [
      { label: "Leads & Follow-ups", href: "/dashboard/leads", icon: "◎", roles: ADMIN_ROLES },
      { label: "Quotations", href: "/dashboard/quotations", icon: "◇", roles: ADMIN_ROLES },
      { label: "Invoices & Payments", href: "/dashboard/invoices", icon: "₹", roles: ADMIN_ROLES },
    ],
  },
  {
    label: "Service",
    icon: "✓",
    roles: ADMIN_ROLES,
    items: [
      { label: "Service Reports", href: "/dashboard/service-reports", icon: "✓", roles: ADMIN_ROLES },
      { label: "AMC Contracts", href: "/dashboard/service-contracts", icon: "↻", roles: ADMIN_ROLES },
      { label: "Feedback & Ratings", href: "/dashboard/feedback", icon: "★", roles: ADMIN_ROLES },
    ],
  },
  {
    label: "Finance & Stock",
    icon: "▤",
    roles: ADMIN_ROLES,
    items: [
      { label: "Expenses & Profit", href: "/dashboard/expenses", icon: "₹", roles: ADMIN_ROLES },
      { label: "Approval Center", href: "/dashboard/approvals", icon: "✓", roles: ADMIN_ROLES },
      { label: "Inventory", href: "/dashboard/inventory", icon: "▤", roles: ADMIN_ROLES },
      { label: "Reports", href: "/dashboard/reports", icon: "▰", roles: ADMIN_ROLES },
    ],
  },
  {
    label: "Communication",
    icon: "✉",
    roles: ADMIN_ROLES,
    items: [
      { label: "Notification Center", href: "/dashboard/notification-center", icon: "◈", roles: ADMIN_ROLES },
      { label: "Automations", href: "/dashboard/automations", icon: "⚡", roles: ADMIN_ROLES },
    ],
  },
  {
    label: "Admin & System",
    icon: "⚙",
    roles: ADMIN_ROLES,
    items: [
      { label: "Project Overview", href: "/dashboard/project-overview", icon: "◫", roles: ADMIN_ROLES },
      { label: "Companies", href: "/dashboard/companies", icon: "▣", roles: [UserRole.SUPER_ADMIN] },
      { label: "Audit Log", href: "/dashboard/audit-logs", icon: "≡", roles: ADMIN_ROLES },
      { label: "Export Center", href: "/dashboard/export-center", icon: "⇩", roles: ADMIN_ROLES },
      { label: "System Health", href: "/dashboard/system-health", icon: "◌", roles: ADMIN_ROLES },
      { label: "Settings", href: "/dashboard/settings", icon: "⚙", roles: ADMIN_ROLES },
    ],
  },
];

function itemActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const roleLabel = USER_ROLE_LABELS[user.role];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={isMobileOpen}
        className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-xl border border-border-strong bg-surface-2 text-ink shadow-sm md:hidden"
      >
        <span aria-hidden="true">☰</span>
      </button>

      {isMobileOpen ? (
        <div
          className="pm-modal-backdrop fixed inset-0 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <nav
        aria-label="Primary"
        className={
          "pm-sidebar fixed inset-y-0 left-0 z-50 flex w-[272px] shrink-0 flex-col overflow-y-auto transition-transform duration-200 ease-out " +
          "md:static md:z-auto md:min-h-dvh md:translate-x-0 " +
          (isMobileOpen ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="sticky top-0 z-10 flex min-h-[72px] items-center justify-between gap-3 border-b border-border-default bg-surface/90 px-5 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-lg font-bold text-accent-ink shadow-[0_6px_18px_rgba(47,217,138,0.28)]">
              PM
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold tracking-[0.05em] text-ink">PEST MANTRA</p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-faint">
                Operations Suite
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close navigation menu"
            className="text-xl text-ink-muted transition-colors hover:text-ink md:hidden"
          >
            ×
          </button>
        </div>

        <div className="px-3 pt-3">
          <Link
            href="/dashboard"
            onClick={() => setIsMobileOpen(false)}
            aria-current={pathname === "/dashboard" ? "page" : undefined}
            className={
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition " +
              (pathname === "/dashboard"
                ? "pm-nav-active text-accent-strong"
                : "text-ink-muted hover:bg-surface-2 hover:text-ink")
            }
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default bg-surface-2 text-base"
              aria-hidden="true"
            >
              ⌂
            </span>
            Dashboard
          </Link>
        </div>

        <div className="flex-1 space-y-0.5 px-3 pb-6 pt-2">
          {GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => item.roles.includes(user.role));
            if (!group.roles.includes(user.role) || visibleItems.length === 0) return null;
            const active = visibleItems.some((item) => itemActive(pathname, item.href));

            return (
              <details key={group.label} open={active} className="group/nav">
                <summary
                  className={
                    "flex cursor-pointer list-none items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition marker:hidden " +
                    (active
                      ? "text-ink"
                      : "text-ink-muted hover:bg-surface-2 hover:text-ink")
                  }
                >
                  <span
                    className={
                      "flex h-8 w-8 items-center justify-center rounded-lg border text-base transition " +
                      (active
                        ? "border-accent/30 bg-accent/10 text-accent"
                        : "border-border-default bg-surface-2 text-ink-faint")
                    }
                    aria-hidden="true"
                  >
                    {group.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{group.label}</span>
                  <span
                    className="text-xs text-ink-faint transition-transform group-open/nav:rotate-90"
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </summary>
                <ul className="ml-[27px] mt-1 space-y-0.5 border-l border-border-default pl-3">
                  {visibleItems.map((item) => {
                    const isActive = itemActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setIsMobileOpen(false)}
                          aria-current={isActive ? "page" : undefined}
                          className={
                            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition " +
                            (isActive
                              ? "pm-nav-active font-semibold text-accent-strong"
                              : "text-ink-muted hover:bg-surface-2 hover:text-ink")
                          }
                        >
                          <span
                            className={isActive ? "text-accent" : "text-ink-faint"}
                            aria-hidden="true"
                          >
                            {item.icon}
                          </span>
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>

        <div className="sticky bottom-0 border-t border-border-default bg-surface/90 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-2 text-sm font-semibold text-ink"
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="mt-0.5 truncate text-xs text-ink-faint">{roleLabel}</p>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

