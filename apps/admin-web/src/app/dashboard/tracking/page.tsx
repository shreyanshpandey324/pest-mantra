import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { LocationLogEntry } from "@/types/tracking";
import { ui } from "@/lib/ui-classes";

/**
 * ⚠️ Backed by GET /location/live — a path and response shape
 * (`{ locations: LocationLogEntry[] }`) taken from
 * MODULE_3_TECHNICIAN_TRACKING.md, never verified against real
 * backend source. See src/types/tracking.ts and
 * src/app/api/tracking/live/route.ts for the same warning — if
 * field names differ on your actual backend, fix them in exactly
 * those two places and this page keeps working unchanged.
 *
 * No mapping library (Leaflet/Google Maps) is installed in this
 * project, and one can't be added in this sandboxed environment
 * (no network access to npm install it or verify it renders). This
 * page shows live positions as a sorted, scannable list instead of
 * literal map pins — genuinely useful today, and a real
 * <TechnicianMap /> can be dropped in later without touching the
 * data-fetching above it.
 */
export default async function TrackingPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  let locations: LocationLogEntry[] = [];
  let loadError: string | null = null;

  try {
    const data = await backendFetch<{ locations: LocationLogEntry[] }>("/location/live", {
      accessToken,
    });
    locations = data.locations;
  } catch (err) {
    loadError =
      err instanceof BackendApiError
        ? err.message
        : "Could not reach /location/live. Confirm this endpoint exists and matches the path in MODULE_3_TECHNICIAN_TRACKING.md.";
  }

  // Most recently seen technician first.
  const sorted = [...locations].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[22px]">Technician Tracking</h1>
        <span className={ui.badge}>UNVERIFIED ENDPOINT</span>
      </div>

      {loadError && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-danger/40 bg-surface px-[18px] py-3.5 text-[13px] text-danger"
        >
          {loadError}
        </div>
      )}

      <div className={`${ui.card} overflow-x-auto`}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-default text-left text-xs text-ink-muted">
              <th className="px-5 py-3.5 font-medium">Technician</th>
              <th className="px-5 py-3.5 font-medium">Last seen</th>
              <th className="px-5 py-3.5 font-medium">Latitude</th>
              <th className="px-5 py-3.5 font-medium">Longitude</th>
              <th className="px-5 py-3.5 font-medium">Map</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && !loadError && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-ink-faint">
                  No technicians currently reporting a location.
                </td>
              </tr>
            )}
            {sorted.map((loc, i) => (
              <tr
                key={`${loc.technicianId}-${loc.timestamp}-${i}`}
                className="border-b border-border-default last:border-b-0"
              >
                <td className="px-5 py-3.5 font-medium">
                  {loc.technicianName ?? (
                    <span className="font-mono text-xs text-ink-muted">{loc.technicianId}</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-ink-muted">
                  {new Date(loc.timestamp).toLocaleString("en-IN")}
                </td>
                <td className="px-5 py-3.5 font-mono text-xs">{loc.lat.toFixed(5)}</td>
                <td className="px-5 py-3.5 font-mono text-xs">{loc.lng.toFixed(5)}</td>
                <td className="px-5 py-3.5">
                  <a
                    href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    Open in Maps ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
