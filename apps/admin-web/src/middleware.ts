import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { ADMIN_WEB_ROLES } from "@/types/auth";

/**
 * Runs before any /dashboard/** page renders. This is the outer
 * gate: no valid, correctly-signed, non-expired access token with
 * an admin-eligible role means an immediate redirect to /login —
 * the page component itself never even starts rendering with
 * unauthenticated state.
 *
 * This is a defense-in-depth layer, not the only one: every real
 * data request still goes to the backend, which independently
 * re-verifies the token and re-checks the user's role/active
 * status against the database.
 *
 * SESSION PERSISTENCE: the access token cookie is short-lived
 * (15 min) by design — that's what makes a stolen access token
 * self-limiting. Without this block, a dispatcher would get logged
 * out every 15 minutes despite holding a valid 7-day refresh
 * token. So when the access token is missing/expired but a refresh
 * token is present, middleware performs a silent refresh against
 * the API (via the BFF's own /api/auth/refresh route) and forwards
 * the newly-issued cookies on the response before continuing —
 * the user never sees this happen.
 */
export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname === "/login";
  const isProtectedRoute = pathname.startsWith("/dashboard");

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
    } else if (!ADMIN_WEB_ROLES.includes(session.role)) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("error", "not_authorized");
      response = NextResponse.redirect(loginUrl);
    } else {
      response = NextResponse.next();
    }
  } else if (isAuthPage && session && ADMIN_WEB_ROLES.includes(session.role)) {
    response = NextResponse.redirect(new URL("/dashboard", req.url));
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
      signal: AbortSignal.timeout(10_000),
    });

    if (!refreshResponse.ok) return null;

    // Standard Fetch API method for reading multiple Set-Cookie
    // headers individually (a plain `.get("set-cookie")` would
    // incorrectly merge the two cookies — access + refresh — into
    // one invalid string).
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
    // Backend unreachable or any other failure — fail closed, the
    // caller falls through to a normal redirect-to-login.
    return null;
  }
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login"],
};
