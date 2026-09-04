import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { TECHNICIAN_APP_ROLES, AuthUser } from "@/types/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { LocationTracker } from "@/components/LocationTracker";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function JobsLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!accessToken) redirect("/login");

  let user: AuthUser;
  try {
    const data = await backendFetch<{ user: AuthUser }>("/auth/me", { accessToken });
    user = data.user;
  } catch (err) {
    if (err instanceof BackendApiError && (err.statusCode === 401 || err.statusCode === 403)) {
      redirect("/login?error=session_expired");
    }
    throw err;
  }

  if (!TECHNICIAN_APP_ROLES.includes(user.role)) redirect("/login?error=not_authorized");

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-canvas pb-20">
      <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between bg-[#17233f] px-4 text-white shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-bold text-accent-ink">PM</div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">Technician App</p>
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2"><LanguageSwitcher /><LogoutButton /></div>
      </header>

      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-border-default bg-surface p-3 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
          <LocationTracker />
        </div>
      </div>

      <main className="p-4 pb-6">{children}</main>

      <nav aria-label="Technician navigation" className="fixed bottom-3 left-1/2 z-40 flex w-[min(calc(100%-1.5rem),480px)] -translate-x-1/2 items-center gap-2 rounded-2xl border border-border-default bg-white/95 p-2 shadow-[0_14px_40px_rgba(15,23,42,0.14)] backdrop-blur">
        <Link href="/jobs" className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent-soft text-sm font-semibold text-accent-strong"><span aria-hidden="true">◆</span> Jobs</Link>
        <Link href="/jobs/expenses" className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-ink-muted hover:bg-surface-2"><span aria-hidden="true">₹</span> Expenses</Link>
      </nav>
    </div>
  );
}
