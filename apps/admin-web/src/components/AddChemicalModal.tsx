"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Chemical, ChemicalUnit, UNIT_LABELS } from "@/types/inventory";
import { ui } from "@/lib/ui-classes";

interface AddChemicalModalProps {
  onClose: () => void;
  onCreated: (chemical: Chemical) => void;
}

export function AddChemicalModal({ onClose, onCreated }: AddChemicalModalProps) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<ChemicalUnit>(ChemicalUnit.LITRE);
  const [currentStock, setCurrentStock] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [error, setError] = useState<string | null>(null);
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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Enter a chemical name.");
      return;
    }
    const stockValue = currentStock === "" ? 0 : Number(currentStock);
    if (Number.isNaN(stockValue) || stockValue < 0) {
      setError("Starting stock must be 0 or more.");
      return;
    }
    const thresholdValue = Number(lowStockThreshold);
    if (Number.isNaN(thresholdValue) || thresholdValue < 0) {
      setError("Low-stock alert level must be 0 or more.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/chemicals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          unit,
          currentStock: stockValue,
          lowStockThreshold: thresholdValue,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? "Could not create this chemical.");
        setIsSubmitting(false);
        return;
      }
      onCreated(json.data.chemical);
    } catch {
      setError("Unable to reach the server. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-chemical-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div className={`${ui.card} w-full max-w-[440px] p-7`} onClick={(e) => e.stopPropagation()}>
        <h2 id="add-chemical-title" className="mb-1 text-[19px]">
          Add Chemical
        </h2>
        <p className="mb-5 text-[13px] text-ink-muted">Add a new item to the master inventory list.</p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={ui.label} htmlFor="name">
              Name
            </label>
            <input
              ref={firstFieldRef}
              id="name"
              className={ui.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={ui.label} htmlFor="unit">
              Unit
            </label>
            <select
              id="unit"
              className={ui.input}
              value={unit}
              onChange={(e) => setUnit(e.target.value as ChemicalUnit)}
            >
              {Object.values(ChemicalUnit).map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={ui.label} htmlFor="currentStock">
                Starting stock
              </label>
              <input
                id="currentStock"
                type="number"
                min="0"
                step="0.01"
                className={ui.input}
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={ui.label} htmlFor="lowStockThreshold">
                Low-stock alert level
              </label>
              <input
                id="lowStockThreshold"
                type="number"
                min="0"
                step="0.01"
                className={ui.input}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
              />
            </div>
          </div>

          <div role="status" aria-live="polite">
            {error && <p className={ui.errorText}>{error}</p>}
          </div>

          <div className="mt-2 flex justify-end gap-3">
            <button type="button" className={ui.btnGhost} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={ui.btnPrimary} disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add chemical"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
