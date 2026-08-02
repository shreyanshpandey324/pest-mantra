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
    <div>
      <h1 className="mb-5 text-[22px]">{title}</h1>
      <div className={`${ui.card} flex flex-col items-center gap-3 px-8 py-16 text-center`}>
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full border border-border-strong text-xl text-ink-faint"
          aria-hidden="true"
        >
          ⏳
        </span>
        <p className="text-base font-semibold">Coming Soon — API Pending</p>
        <p className="max-w-md text-sm text-ink-muted">{description}</p>
        <span className={`${ui.badge} mt-2`}>NO BACKEND ENDPOINT YET</span>
      </div>
    </div>
  );
}
