import { AuthUser } from "@/types/auth";
import { LogoutButton } from "./LogoutButton";

interface TopbarProps {
  user: AuthUser;
}

/**
 * Deliberately has no page-title prop: with 8+ routes now under
 * /dashboard, keeping a title here would mean either prop-drilling
 * it through the shared layout or a pathname->title lookup table to
 * maintain. Each page renders its own <h1> in its content instead —
 * one less thing to keep in sync as pages are added.
 */
export function Topbar({ user }: TopbarProps) {
  return (
    <header className="flex h-[72px] items-center justify-end border-b border-border-default pl-16 pr-4 sm:px-7">
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="font-mono text-xs text-ink-faint">{user.phone}</p>
        </div>
        <div
          aria-hidden="true"
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-2 text-sm font-semibold text-accent"
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
