"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Project, ProjectPriority, ProjectStatus, TechnicianListItem } from "@/types/project";
import { ui } from "@/lib/ui-classes";

interface AssignModalProps {
  projectId: string;
  projectStatus: ProjectStatus;
  onAssigned?: (project: Project) => void;
}

const TIME_SLOTS = [
  "09:00 AM - 11:00 AM",
  "11:00 AM - 01:00 PM",
  "01:00 PM - 03:00 PM",
  "03:00 PM - 05:00 PM",
  "05:00 PM - 07:00 PM",
  "07:00 PM - 09:00 PM",
];

const dutyStatusLabels: Record<TechnicianListItem["dutyStatus"], string> = {
  off_duty: "Off duty",
  on_duty_idle: "On duty",
  en_route: "En route",
  on_site: "On site",
  busy: "Busy",
};

function getTodayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AssignModal({
  projectId,
  projectStatus,
  onAssigned,
}: AssignModalProps) {
  const router = useRouter();

  const [technicians, setTechnicians] = useState<TechnicianListItem[] | null>(null);
  const [techniciansError, setTechniciansError] = useState<string | null>(null);
  const [isLoadingTechnicians, setIsLoadingTechnicians] = useState(true);

  const [technicianId, setTechnicianId] = useState("");
  const [scheduledDate, setScheduledDate] = useState(getTodayDateInputValue());
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState("");
  const [priority, setPriority] = useState<ProjectPriority>(ProjectPriority.NORMAL);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTechnicians() {
      setIsLoadingTechnicians(true);
      setTechniciansError(null);
      try {
        const res = await fetch("/api/technicians", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message ?? "Failed to load technicians");
        }
        if (!cancelled) {
          setTechnicians(json.data.technicians as TechnicianListItem[]);
        }
      } catch {
        if (!cancelled) {
          setTechniciansError("Could not load the technician list. Please try again.");
          setTechnicians([]);
        }
      } finally {
        if (!cancelled) setIsLoadingTechnicians(false);
      }
    }

    loadTechnicians();
    return () => {
      cancelled = true;
    };
  }, []);

  if (projectStatus !== ProjectStatus.NEW) {
    return (
      <div className={`${ui.card} overflow-hidden border border-border-default/70`}>
        <div className="border-b border-border-default bg-surface-2/60 px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">Assign technician</h2>
          <p className="mt-1 text-xs text-ink-faint">Job assignment for this project.</p>
        </div>
        <div className="p-5">
          <p className="text-sm text-ink-muted">
            This project is no longer in the &quot;New&quot; state, so it cannot be assigned or
            reassigned from here.
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!technicianId) {
      setFormError("Please select a technician.");
      return;
    }
    if (!scheduledDate) {
      setFormError("Please select a schedule date.");
      return;
    }
    if (!scheduledTimeSlot) {
      setFormError("Please select a time slot.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianId,
          scheduledDate,
          scheduledTimeSlot,
          priority,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setFormError(json.message ?? "Could not assign the technician. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const assignedProject = json.data.project as Project;
      setSuccessMessage("Technician assigned successfully. Project status is now Assigned.");
      setIsSubmitting(false);

      if (onAssigned) {
        onAssigned(assignedProject);
      }

      router.refresh();
    } catch {
      setFormError("Unable to reach the server. Please check your connection and try again.");
      setIsSubmitting(false);
    }
  }

  const isFormDisabled = isSubmitting || isLoadingTechnicians || (technicians?.length ?? 0) === 0;

  return (
    <div className={`${ui.card} overflow-hidden border border-border-default/70`}>
      <div className="border-b border-border-default bg-surface-2/60 px-5 py-4">
        <h2 className="text-sm font-semibold text-ink">Assign technician</h2>
        <p className="mt-1 text-xs text-ink-faint">
          Choose a technician, schedule date and time slot to move this job from New to Assigned.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 p-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <label className={ui.label}>Alert level</label>
            <span className="text-[10px] text-ink-faint">Technician reminder intensity</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { value: ProjectPriority.NORMAL, label: "Normal", detail: "1 alert" },
              { value: ProjectPriority.HIGH, label: "Medium", detail: "15 min" },
              { value: ProjectPriority.URGENT, label: "High", detail: "5 min" },
            ].map((item) => (
              <button key={item.value} type="button" onClick={() => setPriority(item.value)} className={`rounded-xl border px-3 py-3 text-left transition ${priority === item.value ? "border-accent bg-accent/5 ring-2 ring-accent/10" : "border-border-default bg-surface"}`}>
                <span className={`block text-xs font-bold ${item.value === ProjectPriority.URGENT ? "text-danger" : item.value === ProjectPriority.HIGH ? "text-warning" : "text-ink"}`}>{item.label}</span>
                <span className="mt-1 block text-[10px] text-ink-faint">{item.detail}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={ui.label} htmlFor="assignTechnicianId">
            Technician
          </label>
          <select
            id="assignTechnicianId"
            className={ui.input}
            value={technicianId}
            onChange={(e) => setTechnicianId(e.target.value)}
            disabled={isFormDisabled}
          >
            <option value="">
              {isLoadingTechnicians ? "Loading technicians…" : "Select a technician"}
            </option>
            {(technicians ?? []).map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name} ({tech.employeeCode}) — {dutyStatusLabels[tech.dutyStatus]}
              </option>
            ))}
          </select>
          {techniciansError && <p className={`${ui.errorText} mt-1`}>{techniciansError}</p>}
          {!isLoadingTechnicians && !techniciansError && technicians?.length === 0 && (
            <p className="mt-1 text-[13px] text-ink-faint">No technicians are available right now.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={ui.label} htmlFor="assignScheduledDate">
              Schedule date
            </label>
            <input
              id="assignScheduledDate"
              type="date"
              className={ui.input}
              value={scheduledDate}
              min={getTodayDateInputValue()}
              onChange={(e) => setScheduledDate(e.target.value)}
              disabled={isFormDisabled}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={ui.label} htmlFor="assignTimeSlot">
              Time slot
            </label>
            <select
              id="assignTimeSlot"
              className={ui.input}
              value={scheduledTimeSlot}
              onChange={(e) => setScheduledTimeSlot(e.target.value)}
              disabled={isFormDisabled}
            >
              <option value="">Select a time slot</option>
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div role="status" aria-live="polite">
          {formError && <p className={ui.errorText}>{formError}</p>}
          {successMessage && (
            <p className="text-[13px] font-medium text-success">{successMessage}</p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className={ui.btnPrimary}
            disabled={isFormDisabled}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Assigning…" : "Assign"}
          </button>
        </div>
      </form>
    </div>
  );
}