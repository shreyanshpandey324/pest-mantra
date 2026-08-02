import { jwtVerify, JWTPayload } from "jose";
import { UserRole } from "@/types/auth";

export const ACCESS_COOKIE_NAME = "pm_access_token";
export const REFRESH_COOKIE_NAME = "pm_refresh_token";

export interface SessionPayload extends JWTPayload {
  sub: string;
  role: UserRole;
  branchId?: string;
  tokenType: "access";
}

const secretKey = process.env.JWT_ACCESS_SECRET
  ? new TextEncoder().encode(process.env.JWT_ACCESS_SECRET)
  : undefined;

/**
 * Verifies the signature and expiry of the access token stored in
 * the httpOnly cookie. This runs inside middleware.ts, which
 * executes on the Edge runtime — so it must use `jose` (Web Crypto
 * API, Edge-compatible) rather than the `jsonwebtoken` package
 * (Node-only `crypto` module, throws at runtime on Edge). The
 * backend API still uses `jsonwebtoken` freely since it always
 * runs on Node.js.
 *
 * Returns null on any failure — callers always treat null as
 * "not authenticated", never throw across the middleware boundary.
 */
export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token || !secretKey) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (payload.tokenType !== "access") return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function accessCookieOptions(maxAgeSeconds: number) {
  return {
    name: ACCESS_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function refreshCookieOptions(maxAgeSeconds: number) {
  return {
    name: REFRESH_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
