import { cookies } from "next/headers";
import { ReportsView } from "@/components/ReportsView";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { Project, TechnicianListItem } from "@/types/project";
import { MileageLogEntry } from "@/types/tracking";

export default async function ReportsPage() {
  const token = (await cookies()).get(ACCESS_COOKIE_NAME)?.value;

  const [projectsResult, techniciansResult, mileageResult] = await Promise.allSettled([
    backendFetch<{ projects: Project[] }>("/projects", { accessToken: token }),
    backendFetch<{ technicians: TechnicianListItem[] }>("/technicians", { accessToken: token }),
    backendFetch<{ logs: MileageLogEntry[] }>("/mileage/report", { accessToken: token }),
  ]);

  if (projectsResult.status === "rejected") {
    const error = projectsResult.reason;
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-5 text-sm text-danger">
        {error instanceof BackendApiError ? error.message : "Could not load report data."}
      </div>
    );
  }

  const mileageError = mileageResult.status === "rejected"
    ? mileageResult.reason instanceof BackendApiError
      ? mileageResult.reason.message
      : "Mileage report is currently unavailable."
    : null;

  const techniciansError = techniciansResult.status === "rejected"
    ? techniciansResult.reason instanceof BackendApiError
      ? techniciansResult.reason.message
      : "Technician data is currently unavailable."
    : null;

  return (
    <ReportsView
      projects={projectsResult.value.projects ?? []}
      technicians={techniciansResult.status === "fulfilled" ? techniciansResult.value.technicians ?? [] : []}
      mileage={mileageResult.status === "fulfilled" ? mileageResult.value.logs ?? [] : []}
      mileageError={mileageError}
      techniciansError={techniciansError}
    />
  );
}
