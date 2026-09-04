export const CUSTOMER_PORTAL_COOKIE_NAME = "pm_customer_portal_session";
export const CUSTOMER_PORTAL_MAX_AGE = 12 * 60 * 60;

export function customerPortalCookieOptions(maxAge = CUSTOMER_PORTAL_MAX_AGE) {
  return {
    name: CUSTOMER_PORTAL_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
