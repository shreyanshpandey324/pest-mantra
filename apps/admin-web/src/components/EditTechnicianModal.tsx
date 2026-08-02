"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ui } from "@/lib/ui-classes";
import { EditTechnicianFormData } from "@/types/project";

interface EditTechnicianModalProps {
  technician: EditTechnicianFormData;
  onClose: () => void;
  onUpdated: () => void;
}

const PHONE_REGEX = /^[6-9]\d{9}$/;

export function EditTechnicianModal({
  technician,
  onClose,
  onUpdated,
}: EditTechnicianModalProps) {
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(technician.name);
  const [phone, setPhone] = useState(technician.phone);
  const [email, setEmail] = useState(technician.email ?? "");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    firstInputRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);

    if (name.trim().length < 2) {
      setError("Enter technician name.");
      return;
    }

    if (!PHONE_REGEX.test(phone.trim())) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/users/${technician.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          branchId: technician.branchId,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        setError(json.message ?? "Unable to update technician.");
        setIsSubmitting(false);
        return;
      }

      onUpdated();
      onClose();
    } catch {
      setError("Unable to connect to server.");
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className={`${ui.card} max-h-[90vh] w-full max-w-[520px] overflow-y-auto p-7`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-xl font-semibold">Edit Technician</h2>

        <p className="mb-6 text-sm text-ink-muted">Update technician details.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="edit-technician-name" className={ui.label}>
              Full Name
            </label>

            <input
              id="edit-technician-name"
              ref={firstInputRef}
              className={ui.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter technician name"
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label htmlFor="edit-technician-phone" className={ui.label}>
              Mobile Number
            </label>

            <input
              id="edit-technician-phone"
              className={ui.input}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="9876543210"
              required
            />
          </div>

          <div>
            <label htmlFor="edit-technician-email" className={ui.label}>
              Email (Optional)
            </label>

            <input
              id="edit-technician-email"
              className={ui.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="technician@pestmantra.in"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
              <p className={ui.errorText}>{error}</p>
            </div>
          )}

          <div className="mt-3 flex items-center justify-end gap-3 border-t border-border-default pt-5">
            <button type="button" className={ui.btnGhost} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>

            <button type="submit" className={ui.btnPrimary} disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? "Updating Technician..." : "Update Technician"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
