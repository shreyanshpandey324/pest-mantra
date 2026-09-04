"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  importLibrary,
  setOptions,
} from "@googlemaps/js-api-loader";

import type { LocationLogEntry } from "@/types/tracking";

interface TechnicianLiveMapProps {
  locations: LocationLogEntry[];
}

const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

function formatLastSeen(recordedAt: string): string {
  return new Date(recordedAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatAge(ageSeconds: number): string {
  if (ageSeconds < 60) {
    return `${ageSeconds}s ago`;
  }

  const minutes = Math.floor(ageSeconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  return `${hours}h ${minutes % 60}m ago`;
}

function formatDutyStatus(
  status: string | null
): string {
  if (!status) {
    return "Unknown";
  }

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

export default function TechnicianLiveMap({
  locations,
}: TechnicianLiveMapProps) {
  const mapElementRef =
    useRef<HTMLDivElement | null>(null);

  const mapRef =
    useRef<google.maps.Map | null>(null);

  const markersRef =
    useRef<
      google.maps.marker.AdvancedMarkerElement[]
    >([]);

  const infoWindowRef =
    useRef<google.maps.InfoWindow | null>(
      null
    );

  const [mapError, setMapError] =
    useState<string | null>(null);

  const validLocations = useMemo(
    () =>
      locations.filter(
        (location) =>
          Number.isFinite(
            location.latitude
          ) &&
          Number.isFinite(
            location.longitude
          ) &&
          location.latitude >= -90 &&
          location.latitude <= 90 &&
          location.longitude >= -180 &&
          location.longitude <= 180
      ),
    [locations]
  );

  useEffect(() => {
    let cancelled = false;

    async function initializeMap(): Promise<void> {
      if (!mapElementRef.current) {
        return;
      }

      if (!GOOGLE_MAPS_API_KEY) {
        setMapError(
          "Google Maps API key is missing. Check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local."
        );

        return;
      }

      try {
        setMapError(null);

        setOptions({
          key: GOOGLE_MAPS_API_KEY,
          v: "weekly",
        });

        const { Map } =
          (await importLibrary(
            "maps"
          )) as google.maps.MapsLibrary;

        const { AdvancedMarkerElement } =
          (await importLibrary(
            "marker"
          )) as google.maps.MarkerLibrary;

        if (
          cancelled ||
          !mapElementRef.current
        ) {
          return;
        }

        const initialLocation =
          validLocations.length > 0
            ? validLocations[0]
            : null;

        const initialCenter =
          initialLocation
            ? {
                lat: initialLocation.latitude,
                lng: initialLocation.longitude,
              }
            : {
                lat: 28.6139,
                lng: 77.209,
              };

        const map = new Map(
          mapElementRef.current,
          {
            center: initialCenter,
            zoom: initialLocation
              ? 14
              : 11,
            ...(GOOGLE_MAPS_MAP_ID ? { mapId: GOOGLE_MAPS_MAP_ID } : {}),
            streetViewControl: true,
            mapTypeControl: true,
            fullscreenControl: true,
            zoomControl: true,
          }
        );

        mapRef.current = map;

        infoWindowRef.current =
          new google.maps.InfoWindow();

        markersRef.current.forEach(
          (marker) => {
            marker.map = null;
          }
        );

        markersRef.current = [];

        validLocations.forEach(
          (location) => {
            const markerElement =
              document.createElement(
                "div"
              );

            markerElement.style.width =
              "18px";

            markerElement.style.height =
              "18px";

            markerElement.style.borderRadius =
              "50%";

            markerElement.style.border =
              "3px solid white";

            markerElement.style.boxShadow =
              "0 2px 8px rgba(0,0,0,0.35)";

            markerElement.style.background =
              location.isLive
                ? "#16a34a"
                : "#f59e0b";

            const marker =
              new AdvancedMarkerElement({
                map,
                position: {
                  lat: location.latitude,
                  lng: location.longitude,
                },
                title:
                  location.technicianName,
                content: markerElement,
              });

            marker.addListener(
              "click",
              () => {
                if (
                  !infoWindowRef.current
                ) {
                  return;
                }

                const statusColor =
                  location.isLive
                    ? "#16a34a"
                    : "#f59e0b";

                const batteryText =
                  location.batteryLevel === null
                    ? "Unknown"
                    : `${Math.round(location.batteryLevel)}%${
                        location.isCharging ? " • Charging" : ""
                      }`;

                const googleMapsUrl =
                  `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

                const content = `
                  <div style="
                    min-width:260px;
                    padding:4px;
                    font-family:Arial,sans-serif;
                    color:#111827;
                  ">
                    <div style="
                      font-size:16px;
                      font-weight:700;
                      margin-bottom:4px;
                    ">
                      ${location.technicianName}
                    </div>

                    ${
                      location.employeeCode
                        ? `
                          <div style="
                            font-size:12px;
                            color:#6b7280;
                            margin-bottom:10px;
                          ">
                            Employee: ${location.employeeCode}
                          </div>
                        `
                        : ""
                    }

                    <div style="
                      display:flex;
                      align-items:center;
                      gap:7px;
                      margin-bottom:9px;
                    ">
                      <span style="
                        width:9px;
                        height:9px;
                        border-radius:50%;
                        background:${statusColor};
                        display:inline-block;
                      "></span>

                      <strong>
                        ${
                          location.isLive
                            ? "Live"
                            : "Stale"
                        }
                      </strong>
                    </div>

                    <div style="
                      font-size:12px;
                      line-height:1.8;
                      color:#4b5563;
                    ">
                      <div>
                        <strong>Duty:</strong>
                        ${formatDutyStatus(
                          location.dutyStatus
                        )}
                      </div>

                      <div>
                        <strong>Last seen:</strong>
                        ${formatLastSeen(
                          location.recordedAt
                        )}
                      </div>

                      <div>
                        <strong>Updated:</strong>
                        ${formatAge(
                          location.ageSeconds
                        )}
                      </div>

                      <div>
                        <strong>Accuracy:</strong>
                        ${Math.round(
                          location.accuracy
                        )}m
                      </div>

                      <div>
                        <strong>Battery:</strong>
                        ${batteryText}
                      </div>

                      <div style="
                        font-family:monospace;
                        font-size:11px;
                        margin-top:4px;
                      ">
                        ${location.latitude.toFixed(
                          6
                        )},
                        ${location.longitude.toFixed(
                          6
                        )}
                      </div>
                    </div>

                    <a
                      href="${googleMapsUrl}"
                      target="_blank"
                      rel="noopener noreferrer"
                      style="
                        display:inline-block;
                        margin-top:10px;
                        color:#2563eb;
                        font-size:12px;
                        font-weight:600;
                        text-decoration:none;
                      "
                    >
                      Open in Google Maps →
                    </a>
                  </div>
                `;

                infoWindowRef.current.setContent(
                  content
                );

                infoWindowRef.current.open({
                  map,
                  anchor: marker,
                });
              }
            );

            markersRef.current.push(
              marker
            );
          }
        );

        if (validLocations.length > 1) {
          const bounds =
            new google.maps.LatLngBounds();

          validLocations.forEach(
            (location) => {
              bounds.extend({
                lat: location.latitude,
                lng: location.longitude,
              });
            }
          );

          map.fitBounds(bounds, 50);

          google.maps.event.addListenerOnce(
            map,
            "bounds_changed",
            () => {
              const zoom =
                map.getZoom();

              if (
                zoom !== undefined &&
                zoom !== null &&
                zoom > 15
              ) {
                map.setZoom(15);
              }
            }
          );
        }
      } catch (error) {
        console.error(
          "Google Maps initialization failed:",
          error
        );

        if (!cancelled) {
          setMapError(
            "Google Maps could not be loaded. Check your API key and Google Maps API configuration."
          );
        }
      }
    }

    void initializeMap();

    return () => {
      cancelled = true;

      markersRef.current.forEach(
        (marker) => {
          marker.map = null;
        }
      );

      markersRef.current = [];

      mapRef.current = null;

      infoWindowRef.current = null;
    };
  }, [validLocations]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-default bg-surface">
      <div
        ref={mapElementRef}
        className="h-[560px] w-full"
      />

      {mapError && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-surface/90 p-6 backdrop-blur-sm">
          <div className="max-w-md rounded-2xl border border-danger/40 bg-surface px-6 py-5 text-center shadow-lg">
            <div className="text-sm font-semibold text-danger">
              Google Maps unavailable
            </div>

            <div className="mt-2 text-xs leading-5 text-ink-muted">
              {mapError}
            </div>
          </div>
        </div>
      )}

      <div className="absolute right-20 top-4 z-[1000] rounded-xl border border-border-default bg-surface/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-ink">
              Live
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-ink">
              Stale
            </span>
          </div>

          <div className="text-ink-muted">
            {validLocations.length} technician
            {validLocations.length === 1
              ? ""
              : "s"}
          </div>
        </div>
      </div>

      {validLocations.length === 0 &&
        !mapError && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-[1000] -translate-x-1/2">
            <div className="rounded-xl border border-border-default bg-surface/95 px-5 py-3 text-center shadow-lg backdrop-blur">
              <div className="text-sm font-medium text-ink">
                No GPS locations available
              </div>

              <div className="mt-1 text-xs text-ink-muted">
                Technicians will appear
                here when they start
                reporting their location.
              </div>
            </div>
          </div>
        )}
    </div>
  );
}