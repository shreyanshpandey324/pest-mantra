"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DutyStatus } from "@/types/job";
import { ui } from "@/lib/ui-classes";

export function DutyToggle() {
  const router = useRouter();

  const [status, setStatus] =
    useState<DutyStatus | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [odometer, setOdometer] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const res = await fetch(
          "/api/duty/status"
        );

        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message);
        }

        if (!cancelled) {
          setStatus(
            json.data.profile.currentDutyStatus
          );
        }
      } catch {
        if (!cancelled) {
          setError(
            "Could not load duty status."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const isOnDuty =
    status !== null &&
    status !== "off_duty";

  async function handleToggle() {
    setError(null);

    const value = Number(odometer);

    if (
      odometer.trim() === "" ||
      !Number.isFinite(value) ||
      value < 0
    ) {
      setError(
        "Please enter a valid odometer reading."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = isOnDuty
        ? "/api/duty/end"
        : "/api/duty/start";

      const body = isOnDuty
        ? { odometerEnd: value }
        : { odometerStart: value };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(
          json.message ??
            "Could not update duty status."
        );
        return;
      }

      setStatus(
        json.data.profile.currentDutyStatus
      );

      setOdometer("");

      router.refresh();
    } catch {
      setError(
        "Unable to reach the server. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={`${ui.card} p-5`}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] text-ink-muted">
          Duty status
        </p>

        {!isLoading && (
          <span
            className={`${ui.badge} ${
              isOnDuty
                ? "border-success/50 text-success"
                : ""
            }`}
          >
            {isOnDuty
              ? "ON DUTY"
              : "OFF DUTY"}
          </span>
        )}
      </div>

      {error && (
        <p className={`${ui.errorText} mb-3`}>
          {error}
        </p>
      )}

      {!isLoading && (
        <div className="mb-3">
          <label
            htmlFor="duty-odometer"
            className="mb-1.5 block text-[13px] text-ink-muted"
          >
            {isOnDuty
              ? "Current odometer reading (km)"
              : "Starting odometer reading (km)"}
          </label>

          <input
            id="duty-odometer"
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            value={odometer}
            onChange={(event) =>
              setOdometer(event.target.value)
            }
            placeholder="e.g. 12540.0"
            disabled={isSubmitting}
            className="w-full rounded-xl border border-border-default bg-surface px-3.5 py-3 text-sm outline-none transition focus:border-ink"
          />
        </div>
      )}

      <button
        type="button"
        className={
          isOnDuty
            ? ui.btnActionSecondary
            : ui.btnAction
        }
        onClick={handleToggle}
        disabled={
          isLoading ||
          isSubmitting ||
          odometer.trim() === ""
        }
        aria-busy={isSubmitting}
      >
        {isLoading
          ? "Loading…"
          : isSubmitting
            ? "Updating…"
            : isOnDuty
              ? "End Duty"
              : "Start Duty"}
      </button>
    </div>
  );
}