import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { Project } from "@/types/project";
import ProjectsClient from "@/components/ProjectsClient";

export default async function ProjectsPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  let projects: Project[] = [];
  let loadError: string | null = null;

  try {
    const data = await backendFetch<{ projects: Project[] }>("/projects", {
      accessToken,
    });

    projects = data.projects ?? [];
  } catch (err) {
    loadError =
      err instanceof BackendApiError
        ? err.message
        : "Could not load projects.";
  }

  return (
    <>
      {loadError && (
        <div className="mb-4 rounded-lg border border-red-500 bg-red-500/10 p-4 text-red-400">
          {loadError}
        </div>
      )}

      <ProjectsClient
        projects={projects}
      />
    </>
  );
}