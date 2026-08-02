"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Project, TechnicianListItem } from "@/types/project";
import { ui } from "@/lib/ui-classes";

interface AssignModalProps {
  project: Project;
  onClose: () => void;
  onAssigned: (project: Project) => void;
}

export function AssignModal({ project, onClose, onAssigned }: AssignModalProps) {
  const [technicians, setTechnicians] = useState<TechnicianListItem[] | null>(null);
  const [technicianId, setTechnicianId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstFieldRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    async function loadTechnicians() {
      try {
        const res = await fetch("/api/technicians");
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message ?? "Failed to load technicians");
        }
        if (!cancelled) setTechnicians(json.data.technicians);
      } catch {
        if (!cancelled) setLoadError("Could not load the technician list. Please try again.");
      }
    }
    loadTechnicians();
    return () => {
      cancelled = true;
    };
  }, []);

  const onDutyTechnicians = (technicians ?? []).filter((t) => t.dutyStatus !== "off_duty");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!technicianId) {
      setError("Select a technician.");
      return;
    }
    if (!scheduledDate) {
      setError("Select a date.");
      return;
    }
    if (!scheduledTimeSlot.trim()) {
      setError("Enter a time slot.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${project._id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianId, scheduledDate, scheduledTimeSlot }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? "Could not assign the technician.");
        setIsSubmitting(false);
        return;
      }
      onAssigned(json.data.project);
    } catch {
      setError("Unable to reach the server. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className={`${ui.card} w-full max-w-[440px] p-7`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="assign-title" className="mb-1 text-[19px]">
          Assign Technician
        </h2>
        <p className="mb-5 text-[13px] text-ink-muted">
          {project.customerName} — {project.projectCode}
        </p>

        {loadError && <p className={`${ui.errorText} mb-3`}>{loadError}</p>}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={ui.label} htmlFor="technicianId">
              Technician (on duty only)
            </label>
            <select
              id="technicianId"
              ref={firstFieldRef}
              className={ui.input}
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              disabled={!technicians}
            >
              <option value="">{technicians === null ? "Loading…" : "Select a technician"}</option>
              {onDutyTechnicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name} ({tech.employeeCode})
                </option>
              ))}
            </select>
            {technicians !== null && onDutyTechnicians.length === 0 && (
              <p className="text-xs text-ink-faint">No technicians are currently on duty.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={ui.label} htmlFor="scheduledDate">
              Date
            </label>
            <input
              id="scheduledDate"
              type="date"
              className={ui.input}
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={ui.label} htmlFor="scheduledTimeSlot">
              Time slot
            </label>
            <input
              id="scheduledTimeSlot"
              className={ui.input}
              placeholder="e.g. 10:00 AM"
              value={scheduledTimeSlot}
              onChange={(e) => setScheduledTimeSlot(e.target.value)}
            />
          </div>

          <div role="status" aria-live="polite">
            {error && <p className={ui.errorText}>{error}</p>}
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" className={ui.btnGhost} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={ui.btnPrimary}
              disabled={isSubmitting || !technicians}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "Assigning…" : "Assign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
