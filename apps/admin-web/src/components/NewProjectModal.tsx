"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ServiceType, SERVICE_TYPE_LABELS, Project } from "@/types/project";
import { ui } from "@/lib/ui-classes";

interface NewProjectModalProps {
  onClose: () => void;
  onCreated: (project: Project) => void;
}

const PHONE_REGEX = /^[6-9]\d{9}$/;

export function NewProjectModal({ onClose, onCreated }: NewProjectModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>(ServiceType.COCKROACH);
  const [notes, setNotes] = useState("");
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

    if (customerName.trim().length < 2) {
      setError("Enter the customer's name.");
      return;
    }
    if (!PHONE_REGEX.test(customerPhone.trim())) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (address.trim().length < 5) {
      setError("Enter the service address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          address: address.trim(),
          serviceType,
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? "Could not create the project.");
        setIsSubmitting(false);
        return;
      }
      onCreated(json.data.project);
    } catch {
      setError("Unable to reach the server. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-project-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className={`${ui.card} max-h-[90vh] w-full max-w-[480px] overflow-y-auto p-7`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="new-project-title" className="mb-1 text-[19px]">
          New Project
        </h2>
        <p className="mb-5 text-[13px] text-ink-muted">
          Log a new booking taken by phone or WhatsApp.
        </p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={ui.label} htmlFor="customerName">
              Customer name
            </label>
            <input
              id="customerName"
              ref={firstFieldRef}
              className={ui.input}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={ui.label} htmlFor="customerPhone">
              Phone number
            </label>
            <input
              id="customerPhone"
              className={ui.input}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={ui.label} htmlFor="address">
              Address
            </label>
            <input
              id="address"
              className={ui.input}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={ui.label} htmlFor="serviceType">
              Service type
            </label>
            <select
              id="serviceType"
              className={ui.input}
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as ServiceType)}
            >
              {Object.values(ServiceType).map((type) => (
                <option key={type} value={type}>
                  {SERVICE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={ui.label} htmlFor="notes">
              Notes (optional)
            </label>
            <input
              id="notes"
              className={ui.input}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
