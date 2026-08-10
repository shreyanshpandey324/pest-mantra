"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ServiceType, SERVICE_TYPE_LABELS, Project } from "@/types/project";
import { ui } from "@/lib/ui-classes";

interface NewProjectModalProps {
  onClose: () => void;
  onCreated: (project: Project) => void;
}

const PHONE_REGEX = /^[6-9]\d{9}$/;
const steps = ["Customer", "Service", "Review"] as const;

type ModalStep = (typeof steps)[number];

export function NewProjectModal({ onClose, onCreated }: NewProjectModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>(ServiceType.COCKROACH);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<ModalStep>("Customer");
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function validateStep(currentStep: ModalStep): boolean {
    if (currentStep === "Customer") {
      if (customerName.trim().length < 2) {
        setError("Enter the customer's name.");
        return false;
      }
      if (!PHONE_REGEX.test(customerPhone.trim())) {
        setError("Enter a valid 10-digit mobile number.");
        return false;
      }
      setError(null);
      return true;
    }

    if (currentStep === "Service") {
      if (address.trim().length < 5) {
        setError("Enter the service address.");
        return false;
      }
      setError(null);
      return true;
    }

    setError(null);
    return true;
  }

  function handleNext(e?: React.MouseEvent<HTMLButtonElement>) {
    e?.preventDefault();

    if (!validateStep(step)) return;

    const currentIndex = steps.indexOf(step);

    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  }

  function handleBack() {
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!validateStep("Customer") || !validateStep("Service")) {
      setStep("Customer");
      return;
    }

    if (!validateStep("Service")) {
      setStep("Service");
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
        className={`${ui.card} max-h-[90vh] w-full max-w-[640px] overflow-y-auto p-0 sm:p-0`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border-default bg-surface-2/70 px-6 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
                New booking
              </p>
              <h2 id="new-project-title" className="text-[21px] font-semibold text-ink">
                Create Project
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                Capture a new pest control request with a premium, guided workflow.
              </p>
            </div>
            <button type="button" className={ui.btnGhost} onClick={onClose}>
              Close
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {steps.map((item, index) => {
              const isActive = item === step;
              const isComplete = steps.indexOf(step) > index;
              return (
                <div
                  key={item}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    isActive
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : isComplete
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-border-default bg-surface text-ink-muted"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-[11px]">
                    {index + 1}
                  </span>
                  {item}
                </div>
              );
            })}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            if (step !== "Review") {
              e.preventDefault();
              return;
            }

            handleSubmit(e);
          }}
          noValidate
          className="flex flex-col gap-5 px-6 py-6 sm:px-7"
        >
          {step === "Customer" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 rounded-2xl border border-border-default/70 bg-surface-2/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-faint">
                  Customer details
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  Capture the lead’s information with a clear, professional flow.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
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

              <div className="flex flex-col gap-1.5 md:col-span-2">
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
            </div>
          )}

          {step === "Service" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 rounded-2xl border border-border-default/70 bg-surface-2/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-faint">
                  Service details
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  Confirm where the service is needed and the requested treatment.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
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

              <div className="flex flex-col gap-1.5 md:col-span-2">
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
            </div>
          )}

          {step === "Review" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border-default/70 bg-surface-2/60 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ink-faint">
                  Review request
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  Verify the booking details before submitting it into the workspace.
                </p>
              </div>

              <div className="grid gap-3 rounded-2xl border border-border-default/70 bg-surface p-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-ink-faint">Customer</p>
                  <p className="mt-1 font-medium text-ink">{customerName || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-ink-faint">Phone</p>
                  <p className="mt-1 font-medium text-ink">{customerPhone || "—"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-ink-faint">Address</p>
                  <p className="mt-1 font-medium text-ink">{address || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-ink-faint">Service type</p>
                  <p className="mt-1 font-medium text-ink">{SERVICE_TYPE_LABELS[serviceType]}</p>
                </div>
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
            </div>
          )}

          <div role="status" aria-live="polite">
            {error && <p className={ui.errorText}>{error}</p>}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border-default pt-4 sm:flex-row sm:justify-between">
            <div className="flex gap-3">
              <button type="button" className={ui.btnGhost} onClick={onClose}>
                Cancel
              </button>
              {step !== "Customer" && (
                <button type="button" className={ui.btnGhost} onClick={handleBack}>
                  Back
                </button>
              )}
            </div>

            <div className="flex gap-3"> 
              {step !== "Review" ? (
                <button type="button" className={ui.btnPrimary} onClick={(e) => handleNext(e)}>
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  className={ui.btnPrimary}
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting ? "Creating…" : "Create project"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
