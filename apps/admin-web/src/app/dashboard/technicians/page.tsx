import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { TechnicianListItem } from "@/types/project";
import { TechniciansClient } from "@/components/TechniciansClient";

export default async function TechniciansPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  let technicians: TechnicianListItem[] = [];
  let loadError: string | null = null;

  try {
    const data = await backendFetch<{
      technicians: TechnicianListItem[];
    }>("/technicians", {
      accessToken,
    });

    technicians = data.technicians;
  } catch (err) {
    loadError =
      err instanceof BackendApiError
        ? err.message
        : "Could not load technicians.";
  }

  return (
    <TechniciansClient
      technicians={technicians}
      loadError={loadError}
    />
  );
}