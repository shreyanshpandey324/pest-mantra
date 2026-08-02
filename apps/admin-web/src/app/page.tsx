import { redirect } from "next/navigation";

/**
 * The real auth decision (valid session? which role? silent
 * refresh if the access token expired but the refresh token is
 * still good?) lives in one place only: middleware.ts, which runs
 * on every request to /dashboard/**. Duplicating that logic here
 * would mean two places that can drift out of sync — so this page
 * does nothing but hand off to the route middleware actually
 * protects.
 */
export default function RootPage() {
  redirect("/dashboard");
}
