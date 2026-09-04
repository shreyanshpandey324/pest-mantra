import { cookies } from "next/headers";
import { SettingsData, SettingsView } from "@/components/SettingsView";
import { TeamBranchOption } from "@/components/CreateUserForm";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { TechnicianListItem } from "@/types/project";

export default async function SettingsPage() {
  const token = (await cookies()).get(ACCESS_COOKIE_NAME)?.value;

  const [settingsResult, techniciansResult, branchesResult] = await Promise.allSettled([
    backendFetch<{ settings: SettingsData }>("/settings", { accessToken: token }),
    backendFetch<{ technicians: TechnicianListItem[] }>("/technicians", { accessToken: token }),
    backendFetch<{ branches: TeamBranchOption[] }>("/companies/branches", { accessToken: token }),
  ]);

  if (settingsResult.status === "rejected") {
    const error = settingsResult.reason;
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-5 text-sm text-danger">
        {error instanceof BackendApiError ? error.message : "Could not load settings."}
      </div>
    );
  }

  const techniciansLoadError = techniciansResult.status === "rejected"
    ? techniciansResult.reason instanceof BackendApiError
      ? techniciansResult.reason.message
      : "Could not load technicians."
    : null;

  const branchesLoadError = branchesResult.status === "rejected"
    ? branchesResult.reason instanceof BackendApiError
      ? branchesResult.reason.message
      : "Could not load branches."
    : null;

  return (
    <SettingsView
      initial={settingsResult.value.settings}
      initialTechnicians={techniciansResult.status === "fulfilled" ? techniciansResult.value.technicians ?? [] : []}
      techniciansLoadError={techniciansLoadError}
      branches={branchesResult.status === "fulfilled" ? branchesResult.value.branches ?? [] : []}
      branchesLoadError={branchesLoadError}
    />
  );
}
