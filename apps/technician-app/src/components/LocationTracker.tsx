"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ui } from "@/lib/ui-classes";

type TrackerState =
  | "checking"
  | "off_duty"
  | "waiting"
  | "tracking"
  | "permission_denied"
  | "error";

interface DutyStatusResponse {
  success: boolean;
  data?: {
    profile?: {
      currentDutyStatus?: string;
    };
  };
  message?: string;
}

const LOCATION_SEND_INTERVAL_MS = 15_000;

export function LocationTracker() {
  const watchIdRef =
    useRef<number | null>(null);

  const lastSentAtRef =
    useRef<number>(0);

  const sendingRef =
    useRef(false);

  const mountedRef =
    useRef(true);

  const [state, setState] =
    useState<TrackerState>("checking");

  const [message, setMessage] =
    useState("Checking duty status...");

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const [coordinates, setCoordinates] =
    useState<{
      latitude: number;
      longitude: number;
    } | null>(null);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      );

      watchIdRef.current = null;
    }
  }, []);

  const sendLocation = useCallback(
    async (
      position: GeolocationPosition
    ) => {
      if (sendingRef.current) {
        return;
      }

      const now = Date.now();

      if (
        now - lastSentAtRef.current <
        LOCATION_SEND_INTERVAL_MS
      ) {
        return;
      }

      sendingRef.current = true;

      const {
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
      } = position.coords;

      try {
        const body: {
          latitude: number;
          longitude: number;
          accuracy?: number;
          speed?: number;
          heading?: number;
        } = {
          latitude,
          longitude,
          accuracy,
        };

        if (
          speed !== null &&
          Number.isFinite(speed) &&
          speed >= 0
        ) {
          body.speed = speed;
        }

        if (
          heading !== null &&
          Number.isFinite(heading) &&
          heading >= 0 &&
          heading <= 360
        ) {
          body.heading = heading;
        }

        const response = await fetch(
          "/api/location/update",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify(body),
            cache: "no-store",
          }
        );

        const json =
          (await response.json()) as {
            success?: boolean;
            message?: string;
          };

        if (!response.ok || !json.success) {
          throw new Error(
            json.message ??
              "Location update failed"
          );
        }

        lastSentAtRef.current = now;

        if (mountedRef.current) {
          setCoordinates({
            latitude,
            longitude,
          });

          setLastUpdated(
            new Date()
          );

          setState("tracking");

          setMessage(
            "Your live location is being shared while you are on duty."
          );
        }
      } catch (error) {
        console.error(
          "Location update failed:",
          error
        );

        if (mountedRef.current) {
          setState("error");

          setMessage(
            error instanceof Error
              ? error.message
              : "Could not update your location."
          );
        }
      } finally {
        sendingRef.current = false;
      }
    },
    []
  );

  const startWatching = useCallback(() => {
    if (
      typeof navigator ===
      "undefined" ||
      !navigator.geolocation
    ) {
      setState("error");
      setMessage(
        "This browser does not support GPS location."
      );
      return;
    }

    stopWatching();

    setState("waiting");

    setMessage(
      "Waiting for your GPS location..."
    );

    lastSentAtRef.current = 0;

    watchIdRef.current =
      navigator.geolocation.watchPosition(
        (position) => {
          void sendLocation(position);
        },
        (error) => {
          if (!mountedRef.current) {
            return;
          }

          if (
            error.code ===
            error.PERMISSION_DENIED
          ) {
            setState(
              "permission_denied"
            );

            setMessage(
              "Location permission was denied. Allow location access in your browser settings."
            );

            return;
          }

          if (
            error.code ===
            error.POSITION_UNAVAILABLE
          ) {
            setState("error");

            setMessage(
              "GPS location is currently unavailable. Check that location services are enabled."
            );

            return;
          }

          setState("error");

          setMessage(
            "Unable to get your current GPS location."
          );
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10_000,
          timeout: 20_000,
        }
      );
  }, [sendLocation, stopWatching]);

  const checkDutyStatus = useCallback(
    async () => {
      try {
        const response = await fetch(
          "/api/duty/status",
          {
            cache: "no-store",
          }
        );

        const json =
          (await response.json()) as DutyStatusResponse;

        if (
          !response.ok ||
          !json.success
        ) {
          throw new Error(
            json.message ??
              "Could not load duty status."
          );
        }

        const dutyStatus =
          json.data?.profile
            ?.currentDutyStatus;

        const isOnDuty =
          Boolean(dutyStatus) &&
          dutyStatus !==
            "off_duty";

        if (!mountedRef.current) {
          return;
        }

        if (isOnDuty) {
          if (
            watchIdRef.current === null
          ) {
            startWatching();
          }
        } else {
          stopWatching();

          setState("off_duty");

          setMessage(
            "Start duty to begin live GPS tracking."
          );
        }
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        console.error(
          "Duty status check failed:",
          error
        );

        setState("error");

        setMessage(
          "Could not check duty status."
        );
      }
    },
    [startWatching, stopWatching]
  );

  useEffect(() => {
    mountedRef.current = true;

    void checkDutyStatus();

    const interval = window.setInterval(
      () => {
        void checkDutyStatus();
      },
      10_000
    );

    return () => {
      mountedRef.current = false;

      window.clearInterval(
        interval
      );

      stopWatching();
    };
  }, [checkDutyStatus, stopWatching]);

  const stateLabel =
    state === "tracking"
      ? "GPS LIVE"
      : state === "waiting"
        ? "GETTING GPS"
        : state === "off_duty"
          ? "OFF DUTY"
          : state ===
              "permission_denied"
            ? "PERMISSION NEEDED"
            : state === "checking"
              ? "CHECKING"
              : "GPS ERROR";

  const stateClass =
    state === "tracking"
      ? "border-success/50 text-success"
      : state === "off_duty"
        ? "text-ink-muted"
        : state === "permission_denied" ||
            state === "error"
          ? "border-danger/40 text-danger"
          : "border-warning/50 text-warning";

  return (
    <div
      className={`${ui.card} p-5`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">
            Live Location
          </h2>

          <p className="mt-1 text-xs text-ink-muted">
            GPS tracking follows your duty
            status.
          </p>
        </div>

        <span
          className={`${ui.badge} ${stateClass}`}
        >
          {stateLabel}
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-border-default bg-surface p-4">
        <p className="text-sm text-ink-muted">
          {message}
        </p>

        {coordinates && (
          <div className="mt-3 font-mono text-xs text-ink-muted">
            <div>
              Latitude:{" "}
              {coordinates.latitude.toFixed(
                6
              )}
            </div>

            <div>
              Longitude:{" "}
              {coordinates.longitude.toFixed(
                6
              )}
            </div>
          </div>
        )}

        {lastUpdated && (
          <p className="mt-2 text-[11px] text-ink-faint">
            Last sent:{" "}
            {lastUpdated.toLocaleTimeString(
              "en-IN"
            )}
          </p>
        )}
      </div>
    </div>
  );
}