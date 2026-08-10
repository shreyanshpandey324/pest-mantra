import Link from "next/link";
import { ui } from "@/lib/ui-classes";

interface ComingSoonProps {
  title: string;
  description: string;
}

/**
 * Used by Complaints, Reports, and Settings — none of these have a
 * corresponding backend API in Module 1-3 as documented. Per
 * explicit instruction: no invented endpoints, no mock data. This
 * is a real, properly laid-out page state, not a broken link.
 */
export function ComingSoonPage({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold">{title}</h1>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-ink-muted hover:text-accent hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </header>

      <div
        role="status"
        className={`${ui.card} flex flex-col items-center gap-4 px-8 py-20 text-center`}
      >
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full border border-border-strong bg-surface-2 text-2xl text-ink-faint"
          aria-hidden="true"
        >
          ⏳
        </span>

        <div className="flex flex-col gap-1.5">
          <p className="text-base font-semibold">Coming Soon</p>
          <p className="max-w-md text-sm leading-relaxed text-ink-muted">
            {description}
          </p>
        </div>

        <span className={`${ui.badge} mt-1`}>NO BACKEND ENDPOINT YET</span>

        <Link href="/dashboard" className={`${ui.btnGhost} mt-3`}>
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
