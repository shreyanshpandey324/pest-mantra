import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { Project, SERVICE_TYPE_LABELS } from "@/types/project";
import ProjectsClient from "@/components/ProjectsClient";

const PROJECT_VIEWS = new Set(["all", "pending", "upcoming", "today", "in_progress", "completed", "overdue", "cancelled", "unassigned"]);
const SERVICE_TYPES = new Set(Object.keys(SERVICE_TYPE_LABELS));

interface ProjectsPageProps {
  searchParams: Promise<{ search?: string; view?: string; from?: string; to?: string; serviceType?: string }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const params = await searchParams;
  const initialSearch = (params.search ?? "").trim().slice(0, 120);
  const initialView = PROJECT_VIEWS.has(params.view ?? "") ? params.view! : "all";
  const initialFrom = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? "") ? params.from! : "";
  const initialTo = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? "") ? params.to! : "";
  const initialServiceType = SERVICE_TYPES.has(params.serviceType ?? "") ? params.serviceType! : "all";
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  let projects: Project[] = [];
  let loadError: string | null = null;

  try {
    const query = initialSearch ? `?search=${encodeURIComponent(initialSearch)}` : "";
    const data = await backendFetch<{ projects: Project[] }>(`/projects${query}`, { accessToken });
    projects = data.projects ?? [];
  } catch (err) {
    loadError = err instanceof BackendApiError ? err.message : "Could not load projects.";
  }

  return (
    <>
      {loadError && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 p-4 text-danger">
          {loadError}
        </div>
      )}

      <ProjectsClient
        projects={projects}
        initialSearch={initialSearch}
        initialView={initialView as "all" | "pending" | "upcoming" | "today" | "in_progress" | "completed" | "overdue" | "cancelled" | "unassigned"}
        initialFrom={initialFrom}
        initialTo={initialTo}
        initialServiceType={initialServiceType}
      />
    </>
  );
}
