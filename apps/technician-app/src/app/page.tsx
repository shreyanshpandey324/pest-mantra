import { redirect } from "next/navigation";

/**
 * Same reasoning as admin-web's root page: the real auth decision
 * lives entirely in middleware.ts, which protects /jobs/**. This
 * page just hands off rather than duplicating that logic.
 */
export default function RootPage() {
  redirect("/jobs");
}
