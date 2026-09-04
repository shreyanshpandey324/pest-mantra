"use client";

import { useEffect, useMemo, useState } from "react";
import { LocationLogEntry } from "@/types/tracking";
import { ui } from "@/lib/ui-classes";
import TechnicianLiveMap from "@/components/tracking/TechnicianLiveMap";

interface TrackingLiveViewProps {
  initialLocations: LocationLogEntry[];
  initialError?: string | null;
}

interface LiveResponse {
  success?: boolean;
  message?: string;
  data?: {
    locations?: LocationLogEntry[];
  };
}

const REFRESH_INTERVAL_MS = 15_000;

export default function TrackingLiveView({
  initialLocations,
  initialError = null,
}: TrackingLiveViewProps) {
  const [locations, setLocations] = useState(initialLocations);
  const [loadError, setLoadError] = useState<string | null>(initialError);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(new Date());

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      setIsRefreshing(true);

      try {
        const response = await fetch("/api/tracking/live", {
          cache: "no-store",
        });
        const json = (await response.json().catch(() => ({}))) as LiveResponse;

        if (!response.ok || !json.success) {
          throw new Error(json.message ?? "Could not refresh technician locations.");
        }

        if (!active) return;

        setLocations(json.data?.locations ?? []);
        setLoadError(null);
        setLastRefreshedAt(new Date());
      } catch (error) {
        if (!active) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not refresh technician locations."
        );
      } finally {
        if (active) setIsRefreshing(false);
      }
    };

    const interval = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const sorted = useMemo(
    () =>
      [...locations].sort(
        (a, b) =>
          new Date(b.recordedAt).getTime() -
          new Date(a.recordedAt).getTime()
      ),
    [locations]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Technician Tracking</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Live GPS locations reported by technicians. Auto-refreshes every 15 seconds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-full border border-border-default bg-surface px-3 py-1.5 text-xs text-ink-muted">
            {sorted.length} technician{sorted.length === 1 ? "" : "s"} reporting
          </div>
          <div className="rounded-full border border-border-default bg-surface px-3 py-1.5 text-xs text-ink-muted">
            {isRefreshing
              ? "Refreshing…"
              : lastRefreshedAt
                ? `Updated ${lastRefreshedAt.toLocaleTimeString("en-IN")}`
                : "Waiting for refresh"}
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

      <TechnicianLiveMap locations={sorted} />

      <div className={`${ui.card} overflow-x-auto`}>
        <div className="border-b border-border-default px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">Technician Locations</h2>
          <p className="mt-1 text-xs text-ink-muted">Latest GPS report from each technician.</p>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-default text-left text-xs text-ink-muted">
              <th className="px-5 py-3.5 font-medium">Technician</th>
              <th className="px-5 py-3.5 font-medium">Status</th>
              <th className="px-5 py-3.5 font-medium">Last seen</th>
              <th className="px-5 py-3.5 font-medium">Latitude</th>
              <th className="px-5 py-3.5 font-medium">Longitude</th>
              <th className="px-5 py-3.5 font-medium">Accuracy</th>
              <th className="px-5 py-3.5 font-medium">Battery</th>
              <th className="px-5 py-3.5 font-medium">Map</th>
            </tr>
          </thead>

          <tbody>
            {sorted.length === 0 && !loadError && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-ink-faint">
                  No technicians are currently reporting a location.
                </td>
              </tr>
            )}

            {sorted.map((location, index) => (
              <tr
                key={`${location.technicianId}-${location.recordedAt}-${index}`}
                className="border-b border-border-default last:border-b-0"
              >
                <td className="px-5 py-3.5">
                  <div className="font-medium text-ink">{location.technicianName}</div>
                  {location.employeeCode && (
                    <div className="mt-0.5 font-mono text-xs text-ink-muted">
                      {location.employeeCode}
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
                    {location.isLive ? "Live" : "Stale"}
                  </span>
                </td>

                <td className="px-5 py-3.5 text-ink-muted">
                  {new Date(location.recordedAt).toLocaleString("en-IN")}
                </td>
                <td className="px-5 py-3.5 font-mono text-xs">{location.latitude.toFixed(6)}</td>
                <td className="px-5 py-3.5 font-mono text-xs">{location.longitude.toFixed(6)}</td>
                <td className="px-5 py-3.5 text-ink-muted">{Math.round(location.accuracy)}m</td>
                <td className="px-5 py-3.5 text-ink-muted">
                  {location.batteryLevel === null
                    ? "Unknown"
                    : `${Math.round(location.batteryLevel)}%${
                        location.isCharging ? " • Charging" : ""
                      }`}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
