"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DutyStatus } from "@/types/job";
import { ui } from "@/lib/ui-classes";

export function DutyToggle() {
  const router = useRouter();
  const [status, setStatus] = useState<DutyStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadStatus() {
      try {
        const res = await fetch("/api/duty/status");
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message);
        if (!cancelled) setStatus(json.data.profile.currentDutyStatus);
      } catch {
        if (!cancelled) setError("Could not load duty status.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const isOnDuty = status !== null && status !== "off_duty";

  async function handleToggle() {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(isOnDuty ? "/api/duty/end" : "/api/duty/start", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? "Could not update duty status.");
        setIsSubmitting(false);
        return;
      }
      setStatus(json.data.profile.currentDutyStatus);
      // Job list depends on duty status (only on-duty technicians
      // can be assigned new jobs by the admin) — refresh server
      // data so anything relying on it stays in sync.
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={`${ui.card} p-5`}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] text-ink-muted">Duty status</p>
        {!isLoading && (
          <span className={`${ui.badge} ${isOnDuty ? "border-success/50 text-success" : ""}`}>
            {isOnDuty ? "ON DUTY" : "OFF DUTY"}
          </span>
        )}
      </div>

      {error && <p className={`${ui.errorText} mb-3`}>{error}</p>}

      <button
        type="button"
        className={isOnDuty ? ui.btnActionSecondary : ui.btnAction}
        onClick={handleToggle}
        disabled={isLoading || isSubmitting}
        aria-busy={isSubmitting}
      >
        {isLoading ? "Loading…" : isSubmitting ? "Updating…" : isOnDuty ? "End Duty" : "Start Duty"}
      </button>
    </div>
  );
}
