"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { UserRole } from "@/types/auth";
import { ui } from "@/lib/ui-classes";

interface AddTechnicianModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const PHONE_REGEX = /^[6-9]\d{9}$/;

export function AddTechnicianModal({
  onClose,
  onCreated,
}: AddTechnicianModalProps) {
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState("");

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

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
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

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!branchId.trim()) {
      setError("Branch ID is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          password,
          role: UserRole.TECHNICIAN,
          branchId,
        }),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        setError(json.message ?? "Unable to create technician.");
        setIsSubmitting(false);
        return;
      }

      onCreated();
      onClose();
    } catch {
      setError("Unable to connect to server.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
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
        <h2 className="mb-1 text-xl font-semibold">
          Add Technician
        </h2>

        <p className="mb-6 text-sm text-ink-muted">
          Create a new technician account.
        </p>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <div>
            <label htmlFor="technician-name" className={ui.label}>
              Full Name
            </label>

            <input
              id="technician-name"
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
            <label htmlFor="technician-phone" className={ui.label}>
              Mobile Number
            </label>

            <input
              id="technician-phone"
              className={ui.input}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, ""))
              }
              placeholder="9876543210"
              required
            />
          </div>

          <div>
            <label htmlFor="technician-email" className={ui.label}>
              Email (Optional)
            </label>

            <input
              id="technician-email"
              className={ui.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="technician@pestmantra.in"
            />
          </div>

          <div>
            <label htmlFor="technician-password" className={ui.label}>
              Password
            </label>

            <input
              id="technician-password"
              className={ui.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
            />
          </div>          <div>
            <label htmlFor="technician-branch" className={ui.label}>
              Branch ID
            </label>

            <input
              id="technician-branch"
              className={ui.input}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              placeholder="MongoDB Branch ID"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
              <p className={ui.errorText}>{error}</p>
            </div>
          )}

          <div className="mt-3 flex items-center justify-end gap-3 border-t border-border-default pt-5">
            <button
              type="button"
              className={ui.btnGhost}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className={ui.btnPrimary}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting
                ? "Creating Technician..."
                : "Create Technician"}
            </button>
          </div>        </form>
      </div>
    </div>
  );
}