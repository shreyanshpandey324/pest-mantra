"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Chemical, ChemicalCheckout, UNIT_LABELS } from "@/types/inventory";
import { TechnicianListItem } from "@/types/project";
import { ui } from "@/lib/ui-classes";

interface IssueChemicalModalProps {
  chemicals: Chemical[];
  onClose: () => void;
  onIssued: (checkout: ChemicalCheckout) => void;
}

export function IssueChemicalModal({ chemicals, onClose, onIssued }: IssueChemicalModalProps) {
  const [technicians, setTechnicians] = useState<TechnicianListItem[] | null>(null);
  const [technicianId, setTechnicianId] = useState("");
  const [chemicalId, setChemicalId] = useState("");
  const [quantity, setQuantity] = useState("");
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

  const selectedChemical = chemicals.find((c) => c._id === chemicalId);
  const onDutyTechnicians = (technicians ?? []).filter((t) => t.dutyStatus !== "off_duty");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!technicianId) {
      setError("Select a technician.");
      return;
    }
    if (!chemicalId) {
      setError("Select a chemical.");
      return;
    }
    const quantityIssued = Number(quantity);
    if (!quantity || Number.isNaN(quantityIssued) || quantityIssued <= 0) {
      setError("Enter a quantity greater than 0.");
      return;
    }
    if (selectedChemical && quantityIssued > selectedChemical.currentStock) {
      setError(`Only ${selectedChemical.currentStock} ${UNIT_LABELS[selectedChemical.unit]} in stock.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/chemicals/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianId, chemicalId, quantityIssued }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? "Could not check out this chemical.");
        setIsSubmitting(false);
        return;
      }
      onIssued(json.data.checkout);
    } catch {
      setError("Unable to reach the server. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="issue-chemical-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div className={`${ui.card} w-full max-w-[440px] p-7`} onClick={(e) => e.stopPropagation()}>
        <h2 id="issue-chemical-title" className="mb-1 text-[19px]">
          Issue Chemical
        </h2>
        <p className="mb-5 text-[13px] text-ink-muted">Check out stock to an on-duty technician.</p>

        {loadError && <p className={`${ui.errorText} mb-3`}>{loadError}</p>}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={ui.label} htmlFor="technicianId">
              Technician (on duty only)
            </label>
            <select
              ref={firstFieldRef}
              id="technicianId"
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
            <label className={ui.label} htmlFor="chemicalId">
              Chemical
            </label>
            <select
              id="chemicalId"
              className={ui.input}
              value={chemicalId}
              onChange={(e) => setChemicalId(e.target.value)}
            >
              <option value="">Select a chemical</option>
              {chemicals.map((c) => (
                <option key={c._id} value={c._id} disabled={c.currentStock <= 0}>
                  {c.name} — {c.currentStock} {UNIT_LABELS[c.unit]} in stock
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={ui.label} htmlFor="quantity">
              Quantity{selectedChemical ? ` (${UNIT_LABELS[selectedChemical.unit]})` : ""}
            </label>
            <input
              id="quantity"
              type="number"
              min="0"
              step="0.01"
              className={ui.input}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div role="status" aria-live="polite">
            {error && <p className={ui.errorText}>{error}</p>}
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" className={ui.btnGhost} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={ui.btnPrimary} disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? "Issuing…" : "Issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
