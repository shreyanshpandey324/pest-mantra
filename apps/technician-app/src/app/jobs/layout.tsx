import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { TECHNICIAN_APP_ROLES, AuthUser } from "@/types/auth";
import { LogoutButton } from "@/components/LogoutButton";

/**
 * Same defense-in-depth pattern as admin-web's dashboard/layout.tsx:
 * middleware.ts already verified the JWT at the edge; this is the
 * second, authoritative check against the backend (source of
 * truth for whether the account still exists/is active/still has
 * this role).
 */
export default async function JobsLayout({ children }: { children: React.ReactNode }) {
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

  if (!TECHNICIAN_APP_ROLES.includes(user.role)) {
    redirect("/login?error=not_authorized");
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <header className="flex items-center justify-between border-b border-border-default px-4 py-3.5">
        <div>
          <p className="font-mono text-[11px] tracking-wide text-accent">PEST MANTRA</p>
          <p className="text-sm font-semibold">{user.name}</p>
        </div>
        <LogoutButton />
      </header>
      <main className="p-4 pb-10">{children}</main>
    </div>
  );
}
