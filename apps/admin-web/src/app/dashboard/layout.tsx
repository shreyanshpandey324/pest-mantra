import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { ADMIN_WEB_ROLES, AuthUser } from "@/types/auth";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";

/**
 * middleware.ts already checked the JWT's signature and expiry at
 * the edge before this layout even started rendering. This layout
 * performs the second, authoritative check: it asks the backend
 * (source of truth) for the current user via /auth/me, which
 * re-verifies the user still exists, is active, and re-reads their
 * role from the database — not from a token claim that could be
 * stale relative to an admin-side change (e.g. deactivation since
 * the token was issued).
 *
 * If either check fails, the user is bounced to /login. Failure
 * always closes access rather than opening it.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!accessToken) {
    redirect("/login");
  }

  let user: AuthUser;
  try {
    const data = await backendFetch<{ user: AuthUser }>("/auth/me", { accessToken });
    user = data.user;
  } catch (err) {
    if (err instanceof BackendApiError && err.statusCode === 401) {
      redirect("/login");
    }
    redirect("/login");
  }

  if (!ADMIN_WEB_ROLES.includes(user.role)) {
    redirect("/login?error=not_authorized");
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 p-4 sm:p-7">{children}</main>
      </div>
    </div>
  );
}
