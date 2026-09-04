import { AuthUser } from "@/types/auth";
import { LogoutButton } from "./LogoutButton";
import { ServiceReminderBell } from "./ServiceReminderBell";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface TopbarProps {
  user: AuthUser;
}

export function Topbar({ user }: TopbarProps) {
  return (
    <header className="pm-topbar sticky top-0 z-20 flex min-h-[72px] items-center gap-3 pl-16 pr-4 sm:gap-4 sm:px-6 lg:px-8">
      <div className="hidden min-w-0 flex-1 lg:block">
        <form action="/dashboard/customers" method="get" className="max-w-xl">
          <label className="relative block">
            <span className="sr-only">Search customer</span>
            <span
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-faint"
              aria-hidden="true"
            >
              ⌕
            </span>
            <input
              name="q"
              minLength={2}
              maxLength={120}
              placeholder="Search customer, mobile, job or invoice…"
              className="h-10 w-full rounded-xl border border-border-default bg-surface-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:bg-surface-3 focus:ring-2 focus:ring-accent/20"
            />
          </label>
        </form>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <LanguageSwitcher compact />
        <ServiceReminderBell />
        <div className="hidden min-w-0 border-l border-border-default pl-3 text-right sm:block">
          <p className="max-w-44 truncate text-sm font-semibold text-ink">Hi, {user.name}</p>
          <p className="mt-0.5 text-[11px] text-ink-faint">Pest Mantra Operations</p>
        </div>
        <div
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-sm font-semibold text-accent"
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
