import { cookies } from "next/headers";

import { OperationsControlCenter } from "@/components/OperationsControlCenter";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { Project, TechnicianListItem } from "@/types/project";

export default async function ControlCenterPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  let projects: Project[] = [];
  let technicians: TechnicianListItem[] = [];
  let loadError: string | null = null;

  try {
    const [projectData, technicianData] = await Promise.all([
      backendFetch<{ projects: Project[] }>("/projects", { accessToken }),
      backendFetch<{ technicians: TechnicianListItem[] }>("/technicians", { accessToken }),
    ]);

    projects = projectData.projects ?? [];
    technicians = technicianData.technicians ?? [];
  } catch (error) {
    loadError =
      error instanceof BackendApiError
        ? error.message
        : "Could not load operations data.";
  }

  return (
    <OperationsControlCenter
      initialProjects={projects}
      initialTechnicians={technicians}
      loadError={loadError}
    />
  );
}
