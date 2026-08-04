"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Project, TechnicianListItem } from "@/types/project";
import { ui } from "@/lib/ui-classes";

interface AssignModalProps {
  project: Project;
  onClose: () => void;
  onAssigned: (project: Project) => void;
}

const dutyStatusLabels: Record<TechnicianListItem["dutyStatus"], string> = {
  off_duty: "Off duty",
  on_duty_idle: "On duty",
  en_route: "En route",
  on_site: "On site",
  busy: "Busy",
};

const dutyStatusTone: Record<TechnicianListItem["dutyStatus"], string> = {
  off_duty: "border-border-default bg-surface text-ink-muted",
  on_duty_idle: "border-success/30 bg-success/10 text-success",
  en_route: "border-accent/30 bg-accent/10 text-accent",
  on_site: "border-warning/30 bg-warning/10 text-warning",
  busy: "border-danger/30 bg-danger/10 text-danger",
};

export function AssignModal({ project, onClose, onAssigned }: AssignModalProps) {
  const [technicians, setTechnicians] = useState<TechnicianListItem[] | null>(null);
  const [technicianId, setTechnicianId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState("");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

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
  const branches = Array.from(new Set(onDutyTechnicians.map((tech) => tech.branchId).filter(Boolean))) as string[];

  const filteredTechnicians = onDutyTechnicians.filter((tech) => {
    const matchesSearch = `${tech.name} ${tech.employeeCode} ${tech.phone}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesBranch = branchFilter === "all" || tech.branchId === branchFilter;
    return matchesSearch && matchesBranch;
  });

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
        className={`${ui.card} w-full max-w-[760px] overflow-hidden p-0`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border-default bg-surface-2/70 px-6 py-5 sm:px-7">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
                Job assignment
              </p>
              <h2 id="assign-title" className="text-[21px] font-semibold text-ink">
                Assign technician
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                {project.customerName} — {project.projectCode}
              </p>
            </div>
            <div className="rounded-2xl border border-border-default/70 bg-surface px-4 py-3 text-sm text-ink-muted">
              <p className="font-medium text-ink">Availability</p>
              <p className="mt-1 font-mono text-xs text-ink-faint">{onDutyTechnicians.length} on duty</p>
            </div>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[0.95fr_0.95fr]">
          <div className="border-b border-border-default bg-surface-2/50 p-6 lg:border-b-0 lg:border-r">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex-1">
                  <label className={ui.label} htmlFor="technicianSearch">
                    Search technician
                  </label>
                  <input
                    id="technicianSearch"
                    ref={firstFieldRef}
                    className={ui.input}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name, code or phone"
                  />
                </div>
                <div>
                  <label className={ui.label} htmlFor="branchFilter">
                    Branch
                  </label>
                  <select
                    id="branchFilter"
                    className={ui.input}
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                  >
                    <option value="all">All branches</option>
                    {branches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                {technicians === null ? (
                  <div className="rounded-2xl border border-border-default/70 bg-surface p-4 text-sm text-ink-muted">
                    Loading technicians…
                  </div>
                ) : filteredTechnicians.length === 0 ? (
                  <div className="rounded-2xl border border-border-default/70 bg-surface p-4 text-sm text-ink-muted">
                    No matching technicians available.
                  </div>
                ) : (
                  filteredTechnicians.map((tech) => {
                    const isSelected = technicianId === tech.id;
                    return (
                      <button
                        key={tech.id}
                        type="button"
                        onClick={() => setTechnicianId(tech.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-accent/40 bg-accent/10 shadow-[0_10px_30px_rgba(59,130,246,0.12)]"
                            : "border-border-default/70 bg-surface hover:border-accent/30 hover:bg-surface-2/70"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink">{tech.name}</p>
                            <p className="mt-1 font-mono text-xs text-ink-faint">{tech.employeeCode}</p>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${dutyStatusTone[tech.dutyStatus]}`}>
                            {dutyStatusLabels[tech.dutyStatus]}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {tech.skills.slice(0, 3).map((skill) => (
                            <span key={skill} className="rounded-full border border-border-default bg-surface px-2 py-1 text-[11px] text-ink-muted">
                              {skill}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-ink-muted sm:grid-cols-2">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.24em] text-ink-faint">Vehicle</p>
                            <p className="mt-1 font-medium text-ink">{tech.vehicleNumber ?? "—"}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.24em] text-ink-faint">Branch</p>
                            <p className="mt-1 font-medium text-ink">{tech.branchId ?? "—"}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="bg-surface p-6">
            <form onSubmit={handleSubmit} noValidate className="flex h-full flex-col gap-4">
              <div className="rounded-2xl border border-border-default/70 bg-surface-2/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-faint">
                  Schedule details
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  Choose a slot and confirm the assignment for this job.
                </p>
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

              <div className="rounded-2xl border border-border-default/70 bg-surface p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-ink-faint">Estimated arrival</p>
                <p className="mt-2 text-sm font-medium text-ink">{scheduledTimeSlot || "Select a time slot"}</p>
              </div>

              <div role="status" aria-live="polite">
                {error && <p className={ui.errorText}>{error}</p>}
              </div>

              {loadError && <p className={`${ui.errorText}`}>{loadError}</p>}

              <div className="mt-auto flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
      </div>
    </div>
  );
}
