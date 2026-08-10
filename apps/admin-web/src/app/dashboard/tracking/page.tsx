import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import {
  backendFetch,
  BackendApiError,
} from "@/lib/backend-client";
import { LocationLogEntry } from "@/types/tracking";
import { ui } from "@/lib/ui-classes";
import TechnicianLiveMap from "@/components/tracking/TechnicianLiveMap";

export default async function TrackingPage() {
  const cookieStore = await cookies();

  const accessToken =
    cookieStore.get(
      ACCESS_COOKIE_NAME
    )?.value;

  let locations: LocationLogEntry[] = [];
  let loadError: string | null = null;

  try {
    const data =
      await backendFetch<{
        locations: LocationLogEntry[];
      }>("/location/live", {
        accessToken,
      });

    locations = data.locations ?? [];
  } catch (err) {
    loadError =
      err instanceof BackendApiError
        ? err.message
        : "Could not reach /location/live. Confirm that the backend is running and the tracking endpoint is available.";
  }

  const sorted = [...locations].sort(
    (a, b) =>
      new Date(
        b.recordedAt
      ).getTime() -
      new Date(
        a.recordedAt
      ).getTime()
  );

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">
              Technician Tracking
            </h1>

            <p className="mt-1 text-sm text-ink-muted">
              Live GPS locations reported by
              technicians.
            </p>
          </div>

          <div className="rounded-full border border-border-default bg-surface px-3 py-1.5 text-xs text-ink-muted">
            {sorted.length} technician
            {sorted.length === 1
              ? ""
              : "s"} reporting
          </div>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="rounded-2xl border border-danger/40 bg-surface px-[18px] py-3.5 text-[13px] text-danger"
        >
          {loadError}
        </div>
      )}

      <TechnicianLiveMap
        locations={sorted}
      />

      <div className={`${ui.card} overflow-x-auto`}>
        <div className="border-b border-border-default px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">
            Technician Locations
          </h2>

          <p className="mt-1 text-xs text-ink-muted">
            Latest GPS report from each
            technician.
          </p>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-default text-left text-xs text-ink-muted">
              <th className="px-5 py-3.5 font-medium">
                Technician
              </th>

              <th className="px-5 py-3.5 font-medium">
                Status
              </th>

              <th className="px-5 py-3.5 font-medium">
                Last seen
              </th>

              <th className="px-5 py-3.5 font-medium">
                Latitude
              </th>

              <th className="px-5 py-3.5 font-medium">
                Longitude
              </th>

              <th className="px-5 py-3.5 font-medium">
                Accuracy
              </th>

              <th className="px-5 py-3.5 font-medium">
                Battery
              </th>

              <th className="px-5 py-3.5 font-medium">
                Map
              </th>
            </tr>
          </thead>

          <tbody>
            {sorted.length === 0 &&
              !loadError && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-ink-faint"
                  >
                    No technicians are
                    currently reporting a
                    location.
                  </td>
                </tr>
              )}

            {sorted.map(
              (location, index) => (
                <tr
                  key={`${location.technicianId}-${location.recordedAt}-${index}`}
                  className="border-b border-border-default last:border-b-0"
                >
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-ink">
                      {
                        location.technicianName
                      }
                    </div>

                    {location.employeeCode && (
                      <div className="mt-0.5 font-mono text-xs text-ink-muted">
                        {
                          location.employeeCode
                        }
                      </div>
                    )}
                  </td>

                  <td className="px-5 py-3.5">
                    <span
                      className={
                        location.isLive
                          ? "inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700"
                          : "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700"
                      }
                    >
                      {location.isLive
                        ? "Live"
                        : "Stale"}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 text-ink-muted">
                    {new Date(
                      location.recordedAt
                    ).toLocaleString(
                      "en-IN"
                    )}
                  </td>

                  <td className="px-5 py-3.5 font-mono text-xs">
                    {location.latitude.toFixed(
                      6
                    )}
                  </td>

                  <td className="px-5 py-3.5 font-mono text-xs">
                    {location.longitude.toFixed(
                      6
                    )}
                  </td>

                  <td className="px-5 py-3.5 text-ink-muted">
                    {Math.round(
                      location.accuracy
                    )}
                    m
                  </td>

                  <td className="px-5 py-3.5 text-ink-muted">
                    {Math.round(
                      location.batteryLevel
                    )}
                    %
                    {location.isCharging
                      ? " • Charging"
                      : ""}
                  </td>

                  <td className="px-5 py-3.5">
                    <a
                      href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      Open in Maps →
                    </a>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}