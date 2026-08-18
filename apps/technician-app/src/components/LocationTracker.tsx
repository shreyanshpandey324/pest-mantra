"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { ui } from "@/lib/ui-classes";

type TrackerState =
  | "checking"
  | "off_duty"
  | "waiting"
  | "tracking"
  | "permission_denied"
  | "error";

interface DutyStatusResponse {
  success?: boolean;
  data?: {
    profile?: {
      currentDutyStatus?: string;
    };
  };
  message?: string;
}

interface LocationPayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

interface LocationUpdateResponse {
  success?: boolean;
  message?: string;
}

const LOCATION_SEND_INTERVAL_MS = 15_000;
const DUTY_CHECK_INTERVAL_MS = 10_000;

export function LocationTracker() {
  const watchIdRef = useRef<number | null>(null);
  const lastSentAtRef = useRef<number>(0);
  const sendingRef = useRef(false);
  const mountedRef = useRef(true);
  const startingRef = useRef(false);

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

  /*
   * ------------------------------------------------------------
   * STOP GPS WATCHING
   * ------------------------------------------------------------
   */
  const stopWatching = useCallback(() => {
    if (
      watchIdRef.current !== null &&
      typeof navigator !== "undefined" &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      );

      watchIdRef.current = null;
    }

    startingRef.current = false;
  }, []);

  /*
   * ------------------------------------------------------------
   * SEND LOCATION TO BACKEND
   * ------------------------------------------------------------
   */
  const sendLocation = useCallback(
    async (position: GeolocationPosition) => {
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

      const body: LocationPayload = {
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

      try {
        const response = await fetch(
          "/api/location/update",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            cache: "no-store",
          }
        );

        let json: LocationUpdateResponse = {};

        try {
          json =
            (await response.json()) as LocationUpdateResponse;
        } catch {
          // Backend may return an empty/non-JSON response.
        }

        if (
          !response.ok ||
          !json.success
        ) {
          throw new Error(
            json.message ??
              `Location update failed (${response.status}).`
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
        /*
         * Use warning instead of console.error.
         * Next.js development overlay can treat console.error
         * as a development error even when the application
         * itself is still usable.
         */
        console.warn(
          "Location update warning:",
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

  /*
   * ------------------------------------------------------------
   * HANDLE GPS ERRORS
   * ------------------------------------------------------------
   */
  const handleLocationError = useCallback(
    (
      error: GeolocationPositionError
    ) => {
      if (!mountedRef.current) {
        return;
      }

      const code = error?.code;
      const errorMessage = error?.message;

      console.warn(
        "Geolocation warning:",
        {
          code,
          message: errorMessage,
        }
      );

      if (
        code ===
        error.PERMISSION_DENIED
      ) {
        setState(
          "permission_denied"
        );

        setMessage(
          "Location permission is blocked. Allow location access for localhost:3001 and then click Retry Location."
        );

        return;
      }

      if (
        code ===
        error.POSITION_UNAVAILABLE
      ) {
        setState("error");

        setMessage(
          "GPS location is unavailable. Turn on Windows Location Services and make sure the device can determine your location."
        );

        return;
      }

      if (
        code ===
        error.TIMEOUT
      ) {
        setState("error");

        setMessage(
          "GPS location request timed out. Click Retry Location and try again."
        );

        return;
      }

      setState("error");

      setMessage(
        `GPS error${
          code
            ? ` (code ${code})`
            : ""
        }. Click Retry Location to try again.`
      );
    },
    []
  );

  /*
   * ------------------------------------------------------------
   * START GPS WATCHING
   * ------------------------------------------------------------
   */
  const startWatching = useCallback(() => {
    if (
      typeof navigator ===
      "undefined"
    ) {
      return;
    }

    if (!navigator.geolocation) {
      setState("error");

      setMessage(
        "This browser does not support GPS location."
      );

      return;
    }

    if (
      watchIdRef.current !== null ||
      startingRef.current
    ) {
      return;
    }

    startingRef.current = true;

    setState("waiting");

    setMessage(
      "Requesting your current location..."
    );

    lastSentAtRef.current = 0;

    const locationOptions: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 10_000,
      timeout: 30_000,
    };

    try {
      /*
       * First request the current position.
       * This makes sure permission/GPS works before
       * continuous watching starts.
       */
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!mountedRef.current) {
            startingRef.current = false;
            return;
          }

          void sendLocation(
            position
          );

          try {
            const watchId =
              navigator.geolocation.watchPosition(
                (nextPosition) => {
                  if (!mountedRef.current) {
                    return;
                  }

                  startingRef.current = false;

                  void sendLocation(
                    nextPosition
                  );
                },
                (error) => {
                  startingRef.current = false;

                  handleLocationError(
                    error
                  );
                },
                locationOptions
              );

            watchIdRef.current =
              watchId;
          } catch (error) {
            startingRef.current = false;

            console.warn(
              "watchPosition warning:",
              error
            );

            if (mountedRef.current) {
              setState("error");

              setMessage(
                "Could not start continuous GPS tracking."
              );
            }
          }
        },
        (error) => {
          startingRef.current = false;

          handleLocationError(
            error
          );
        },
        locationOptions
      );
    } catch (error) {
      startingRef.current = false;

      console.warn(
        "getCurrentPosition warning:",
        error
      );

      if (mountedRef.current) {
        setState("error");

        setMessage(
          error instanceof Error
            ? `GPS could not start: ${error.message}`
            : "GPS could not start. Check browser and Windows location permissions."
        );
      }
    }
  }, [
    handleLocationError,
    sendLocation,
  ]);

  /*
   * ------------------------------------------------------------
   * CHECK DUTY STATUS
   * ------------------------------------------------------------
   */
  const checkDutyStatus = useCallback(
    async () => {
      try {
        const response =
          await fetch(
            "/api/duty/status",
            {
              cache: "no-store",
            }
          );

        let json: DutyStatusResponse =
          {};

        try {
          json =
            (await response.json()) as DutyStatusResponse;
        } catch {
          // Ignore invalid/empty JSON.
        }

        if (
          !response.ok ||
          !json.success
        ) {
          throw new Error(
            json.message ??
              `Duty status request failed (${response.status}).`
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
            watchIdRef.current ===
              null &&
            !startingRef.current
          ) {
            startWatching();
          }

          return;
        }

        stopWatching();

        setState(
          "off_duty"
        );

        setMessage(
          "Start duty to begin live GPS tracking."
        );
      } catch (error) {
        if (!mountedRef.current) {
          return;
        }

        console.warn(
          "Duty status check warning:",
          error
        );

        setState("error");

        setMessage(
          error instanceof Error
            ? `Could not check duty status: ${error.message}`
            : "Could not check duty status."
        );
      }
    },
    [
      startWatching,
      stopWatching,
    ]
  );

  /*
   * ------------------------------------------------------------
   * RETRY GPS
   * ------------------------------------------------------------
   */
  const retryLocation =
    useCallback(() => {
      stopWatching();

      setState("waiting");

      setMessage(
        "Retrying GPS location..."
      );

      window.setTimeout(() => {
        if (mountedRef.current) {
          startWatching();
        }
      }, 300);
    }, [
      startWatching,
      stopWatching,
    ]);

  /*
   * ------------------------------------------------------------
   * INITIALIZE + DUTY POLLING
   * ------------------------------------------------------------
   */
  useEffect(() => {
    mountedRef.current = true;

    void checkDutyStatus();

    const interval =
      window.setInterval(
        () => {
          void checkDutyStatus();
        },
        DUTY_CHECK_INTERVAL_MS
      );

    return () => {
      mountedRef.current = false;

      window.clearInterval(
        interval
      );

      stopWatching();
    };
  }, [
    checkDutyStatus,
    stopWatching,
  ]);

  /*
   * ------------------------------------------------------------
   * UI STATE
   * ------------------------------------------------------------
   */
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
        : state ===
              "permission_denied" ||
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

        {(state ===
          "permission_denied" ||
          state === "error") && (
          <button
            type="button"
            onClick={retryLocation}
            className={`${ui.btnPrimary} mt-4 w-full`}
          >
            Retry Location
          </button>
        )}
      </div>
    </div>
  );
}