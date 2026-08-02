import { jwtVerify, JWTPayload } from "jose";
import { UserRole } from "@/types/auth";

export const ACCESS_COOKIE_NAME = "pmt_access_token";
export const REFRESH_COOKIE_NAME = "pmt_refresh_token";

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
 * Same Edge-compatible verification as admin-web's session.ts (see
 * that file's comment for why `jose` is required here instead of
 * `jsonwebtoken`). Cookie names are prefixed `pmt_` rather than
 * `pm_` so this app's session cookie never collides with
 * admin-web's if the two are ever run on the same host/port during
 * local development.
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
