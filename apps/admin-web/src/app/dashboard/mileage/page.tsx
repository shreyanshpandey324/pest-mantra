import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { MileageLogEntry } from "@/types/tracking";
import { ui } from "@/lib/ui-classes";

/** Real mileage report backed by GET /mileage/report. */
export default async function MileageReportPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  let logs: MileageLogEntry[] = [];
  let loadError: string | null = null;

  try {
    const data = await backendFetch<{ logs: MileageLogEntry[] }>("/mileage/report", {
      accessToken,
    });
    logs = data.logs;
  } catch (err) {
    loadError =
      err instanceof BackendApiError
        ? err.message
        : "Could not load the mileage report.";
  }

  const totalDistance = logs.reduce((sum, log) => sum + (log.distanceKm ?? 0), 0);
  const completedLogs = logs.filter((l) => l.dutyEndAt && typeof l.distanceKm === "number");

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[22px]">Mileage Report</h1>
      </div>

      {loadError && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-danger/40 bg-surface px-[18px] py-3.5 text-[13px] text-danger"
        >
          {loadError}
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`${ui.card} p-5`}>
          <p className="mb-2 text-[13px] text-ink-muted">Total logged trips</p>
          <p className="font-mono text-2xl font-semibold">{logs.length}</p>
        </div>
        <div className={`${ui.card} p-5`}>
          <p className="mb-2 text-[13px] text-ink-muted">Completed trips</p>
          <p className="font-mono text-2xl font-semibold">{completedLogs.length}</p>
        </div>
        <div className={`${ui.card} p-5`}>
          <p className="mb-2 text-[13px] text-ink-muted">Total distance</p>
          <p className="font-mono text-2xl font-semibold">{totalDistance.toFixed(1)} km</p>
        </div>
      </div>

      <div className={`${ui.card} overflow-x-auto`}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-default text-left text-xs text-ink-muted">
              <th className="px-5 py-3.5 font-medium">Technician</th>
              <th className="px-5 py-3.5 font-medium">Duty start</th>
              <th className="px-5 py-3.5 font-medium">Duty end</th>
              <th className="px-5 py-3.5 font-medium">Odometer start</th>
              <th className="px-5 py-3.5 font-medium">Odometer end</th>
              <th className="px-5 py-3.5 font-medium">Distance</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && !loadError && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-ink-faint">
                  No mileage logs found.
                </td>
              </tr>
            )}
            {logs.map((log, i) => (
              <tr
                key={`${log.technicianId}-${log.dutyStartAt}-${i}`}
                className="border-b border-border-default last:border-b-0"
              >
                <td className="px-5 py-3.5 font-medium">
                  {log.technicianName ?? (
                    <span className="font-mono text-xs text-ink-muted">{log.technicianId}</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-ink-muted">
                  {new Date(log.dutyStartAt).toLocaleString("en-IN")}
                </td>
                <td className="px-5 py-3.5 text-ink-muted">
                  {log.dutyEndAt ? new Date(log.dutyEndAt).toLocaleString("en-IN") : (
                    <span className={ui.badge}>ON DUTY</span>
                  )}
                </td>
                <td className="px-5 py-3.5 font-mono text-xs">{log.odometerStart}</td>
                <td className="px-5 py-3.5 font-mono text-xs">{log.odometerEnd ?? "—"}</td>
                <td className="px-5 py-3.5 font-mono text-xs">
                  {typeof log.distanceKm === "number" ? `${log.distanceKm.toFixed(1)} km` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
