import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { TECHNICIAN_APP_ROLES } from "@/types/auth";

/**
 * Same protection + silent-refresh pattern as admin-web's
 * middleware.ts (see that file's comments for the full reasoning —
 * short-lived access token, silent refresh so a 15-minute token
 * doesn't force a re-login every 15 minutes despite a valid 7-day
 * refresh token). Adapted here only in which routes are protected
 * (/jobs instead of /dashboard) and which role is allowed through
 * (technician only, not admin roles — an admin has no reason to be
 * in this app).
 */
export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const isAuthPage = pathname === "/login";
  const isProtectedRoute = pathname.startsWith("/jobs");

  if (!isProtectedRoute && !isAuthPage) {
    return NextResponse.next();
  }

  const accessToken = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
  let session = await verifySessionToken(accessToken);
  let refreshedSetCookies: string[] = [];

  if (!session && (isProtectedRoute || isAuthPage)) {
    const refreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;
    if (refreshToken) {
      const refreshed = await attemptSilentRefresh(req);
      if (refreshed) {
        session = refreshed.session;
        refreshedSetCookies = refreshed.setCookieHeaders;
      }
    }
  }

  let response: NextResponse;

  if (isProtectedRoute) {
    if (!session) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      response = NextResponse.redirect(loginUrl);
    } else if (!TECHNICIAN_APP_ROLES.includes(session.role)) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("error", "not_authorized");
      response = NextResponse.redirect(loginUrl);
    } else {
      response = NextResponse.next();
    }
  } else if (isAuthPage && session && TECHNICIAN_APP_ROLES.includes(session.role)) {
    response = NextResponse.redirect(new URL("/jobs", req.url));
  } else {
    response = NextResponse.next();
  }

  for (const cookieHeader of refreshedSetCookies) {
    response.headers.append("set-cookie", cookieHeader);
  }

  return response;
}

interface SilentRefreshResult {
  session: Awaited<ReturnType<typeof verifySessionToken>>;
  setCookieHeaders: string[];
}

async function attemptSilentRefresh(req: NextRequest): Promise<SilentRefreshResult | null> {
  try {
    const refreshResponse = await fetch(new URL("/api/auth/refresh", req.url), {
      method: "POST",
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });

    if (!refreshResponse.ok) return null;

    const setCookieHeaders = refreshResponse.headers.getSetCookie?.() ?? [];
    if (setCookieHeaders.length === 0) return null;

    const accessSetCookie = setCookieHeaders.find((c) => c.startsWith(`${ACCESS_COOKIE_NAME}=`));
    const newAccessCookie = accessSetCookie
      ? accessSetCookie.split(";")[0].slice(ACCESS_COOKIE_NAME.length + 1)
      : undefined;

    const session = await verifySessionToken(newAccessCookie);
    if (!session) return null;

    return { session, setCookieHeaders };
  } catch {
    return null;
  }
}

export const config = {
  matcher: ["/", "/jobs/:path*", "/login"],
};
