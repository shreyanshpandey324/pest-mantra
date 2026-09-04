import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import {
  ADMIN_WEB_ROLES,
  AuthUser,
  UserRole,
} from "@/types/auth";

export async function getCurrentUser(): Promise<AuthUser> {

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!accessToken) {
    redirect("/login");
  }

  let user: AuthUser;
  try {
    const data = await backendFetch<{ user: AuthUser }>(
      "/auth/me",
      {
        accessToken,
      }
    );

    user = data.user;
  } catch (err) {
    if (
      err instanceof BackendApiError &&
      (err.statusCode === 401 || err.statusCode === 403)
    ) {
      redirect("/login?error=session_expired");
    }
    // A temporary API/database outage is not an authentication failure. Let
    // the app error boundary show Retry instead of misleadingly logging the
    // user out and sending them into a login loop.
    throw err;
  }

  if (!ADMIN_WEB_ROLES.includes(user.role)) {
    redirect("/login?error=not_authorized");
  }

  return user;
}

export function isSuperAdmin(user: AuthUser): boolean {
  return user.role === UserRole.SUPER_ADMIN;
}

export function isOfficeAdmin(user: AuthUser): boolean {
  return user.role === UserRole.OFFICE_ADMIN;
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return "Developer / Super Admin";

    case UserRole.OFFICE_ADMIN:
      return "Office Admin";

    case UserRole.TECHNICIAN:
      return "Technician";

    default:
      return "Unknown Role";
  }
}
