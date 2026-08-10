"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthUser, UserRole } from "@/types/auth";

interface SidebarProps {
  user: AuthUser;
}

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "⌂",
  },
  {
    label: "Companies",
    href: "/dashboard/companies",
    icon: "▣",
  },
  {
    label: "Projects",
    href: "/dashboard/projects",
    icon: "◆",
  },
  {
    label: "Technicians",
    href: "/dashboard/technicians",
    icon: "◉",
  },
  {
    label: "Technician Tracking",
    href: "/dashboard/tracking",
    icon: "⌖",
  },
  {
    label: "Mileage Report",
    href: "/dashboard/mileage",
    icon: "▥",
  },
  {
    label: "Inventory",
    href: "/dashboard/inventory",
    icon: "▤",
  },
  {
    label: "Complaints",
    href: "/dashboard/complaints",
    icon: "✓",
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    icon: "▰",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: "⚙",
  },
] as const;

export function Sidebar({
  user,
}: SidebarProps) {
  const pathname = usePathname();
  const [
    isMobileOpen,
    setIsMobileOpen,
  ] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setIsMobileOpen(true)
        }
        aria-label="Open navigation menu"
        aria-expanded={isMobileOpen}
        className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg border border-border-default bg-surface text-ink md:hidden"
      >
        <span aria-hidden="true">
          ☰
        </span>
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() =>
            setIsMobileOpen(false)
          }
          aria-hidden="true"
        />
      )}

      <nav
        aria-label="Primary"
        className={
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto border-r border-border-default bg-surface transition-transform duration-200 ease-out " +
          "md:static md:z-auto md:min-h-dvh md:translate-x-0 " +
          (isMobileOpen
            ? "translate-x-0"
            : "-translate-x-full")
        }
      >
        <div
          className="h-1 w-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, var(--color-accent), var(--color-accent) 10px, var(--color-surface) 10px, var(--color-surface) 20px)",
          }}
          aria-hidden="true"
        />

        <div className="flex items-center justify-between px-5 py-6">
          <div>
            <p className="font-mono text-xs tracking-wide text-accent">
              PEST MANTRA
            </p>

            <h2 className="mt-1 text-[17px]">
              Field Console
            </h2>
          </div>

          <button
            type="button"
            onClick={() =>
              setIsMobileOpen(false)
            }
            aria-label="Close navigation menu"
            className="text-ink-muted hover:text-ink md:hidden"
          >
            ×
          </button>
        </div>

        <ul className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(
                    item.href
                  );

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={
                    isActive
                      ? "page"
                      : undefined
                  }
                  onClick={() =>
                    setIsMobileOpen(false)
                  }
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors " +
                    (isActive
                      ? "bg-surface-2 text-ink"
                      : "text-ink-muted hover:bg-surface-2/60 hover:text-ink")
                  }
                >
                  <span
                    aria-hidden="true"
                    className={
                      isActive
                        ? "text-accent"
                        : ""
                    }
                  >
                    {item.icon}
                  </span>

                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-border-default px-5 py-4 text-xs text-ink-faint">
          <p>Signed in as</p>

          <p className="mt-0.5 font-medium text-ink-muted">
            {user.role ===
            UserRole.SUPER_ADMIN
              ? "Super Admin"
              : "Office Admin"}
          </p>
        </div>
      </nav>
    </>
  );
}