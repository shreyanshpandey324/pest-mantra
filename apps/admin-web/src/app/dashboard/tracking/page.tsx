import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { LocationLogEntry } from "@/types/tracking";
import TrackingLiveView from "@/components/tracking/TrackingLiveView";

export default async function TrackingPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  let locations: LocationLogEntry[] = [];
  let loadError: string | null = null;

  try {
    const data = await backendFetch<{ locations: LocationLogEntry[] }>(
      "/location/live",
      { accessToken }
    );
    locations = data.locations ?? [];
  } catch (err) {
    loadError =
      err instanceof BackendApiError
        ? err.message
        : "Could not load technician locations.";
  }

  return <TrackingLiveView initialLocations={locations} initialError={loadError} />;
}
