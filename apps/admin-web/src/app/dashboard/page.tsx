import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { Project } from "@/types/project";
import { LiveBoard } from "@/components/LiveBoard";

/**
 * Initial project list is fetched server-side (fast first paint,
 * no loading spinner on load) using the same access-token cookie
 * the rest of the dashboard relies on. All *interactions* after
 * that (create, assign) happen client-side in LiveBoard, which is
 * the simplest split that still avoids a full-page reload on every
 * action.
 */
export default async function DashboardHomePage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  let projects: Project[] = [];
  let loadError: string | null = null;

  try {
    const data = await backendFetch<{ projects: Project[] }>("/projects", { accessToken });
    projects = data.projects;
  } catch (err) {
    loadError = err instanceof BackendApiError ? err.message : "Could not load projects.";
  }

  return (
    <div>
      <h1 className="mb-5 text-[22px]">Dashboard</h1>
      {loadError && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-danger/40 bg-surface px-[18px] py-3.5 text-[13px] text-danger"
        >
          {loadError}
        </div>
      )}
      <LiveBoard initialProjects={projects} />
    </div>
  );
}
