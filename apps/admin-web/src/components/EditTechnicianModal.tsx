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

const DUTY_OPTIONS = [
  {
    value: "off_duty",
    label: "Off Duty",
  },
  {
    value: "on_duty_idle",
    label: "On Duty",
  },
  {
    value: "en_route",
    label: "En Route",
  },
  {
    value: "on_site",
    label: "On Site",
  },
  {
    value: "busy",
    label: "Busy",
  },
] as const;

export function EditTechnicianModal({
  technician,
  onClose,
  onUpdated,
}: EditTechnicianModalProps) {
  const firstInputRef =
    useRef<HTMLInputElement>(null);

  const [name, setName] = useState(
    technician.name
  );

  const [phone, setPhone] = useState(
    technician.phone
  );

  const [email, setEmail] = useState(
    technician.email ?? ""
  );

  const [vehicleNumber, setVehicleNumber] =
    useState(
      technician.vehicleNumber ?? ""
    );

  const [skills, setSkills] = useState(
    technician.skills.join(", ")
  );

  const [dutyStatus, setDutyStatus] =
    useState(technician.dutyStatus);

  const [isActive, setIsActive] =
    useState(technician.isActive);

  const [newPassword, setNewPassword] =
    useState('');

  const [error, setError] =
    useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  useEffect(() => {
    firstInputRef.current?.focus();

    function handleKeyDown(
      e: KeyboardEvent
    ) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [onClose]);

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError(null);

    if (name.trim().length < 2) {
      setError(
        "Enter technician name."
      );
      return;
    }

    if (
      !PHONE_REGEX.test(phone.trim())
    ) {
      setError(
        "Enter a valid 10-digit mobile number."
      );
      return;
    }

    if (newPassword.length > 0 && newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/users/${technician.id}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            email:
              email.trim() ||
              undefined,
            branchId:
              technician.branchId,
            vehicleNumber:
              vehicleNumber.trim() ||
              undefined,
            skills: skills
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            dutyStatus,
            isActive,
          }),
        }
      );

      const json =
        await response.json();

      if (
        !response.ok ||
        !json.success
      ) {
        setError(
          json.message ??
            "Unable to update technician."
        );

        setIsSubmitting(false);
        return;
      }

      if (newPassword.length > 0) {
        const passwordResponse = await fetch(
          "/api/users/" + technician.id + "/password",
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ password: newPassword }),
          }
        );

        const passwordJson = await passwordResponse.json();

        if (!passwordResponse.ok || !passwordJson.success) {
          setError(
            passwordJson.message ??
              "Unable to update technician password."
          );
          setIsSubmitting(false);
          return;
        }
      }

      onUpdated();
      onClose();
    } catch {
      setError(
        "Unable to connect to server."
      );

      setIsSubmitting(false);
      return;
    }

}

return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pm-modal-backdrop p-4"
      onClick={onClose}
    >
      <div
        className={`${ui.card} max-h-[90vh] w-full max-w-[560px] overflow-y-auto p-7`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-xl font-semibold">
          Edit Technician
        </h2>

        <p className="mb-6 text-sm text-ink-muted">
          Update technician details.
        </p>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <div>
            <label
              htmlFor="edit-technician-name"
              className={ui.label}
            >
              Full Name
            </label>

            <input
              id="edit-technician-name"
              ref={firstInputRef}
              className={ui.input}
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />
          </div>

          <div>
            <label
              htmlFor="edit-technician-phone"
              className={ui.label}
            >
              Mobile Number
            </label>

            <input
              id="edit-technician-phone"
              className={ui.input}
              maxLength={10}
              value={phone}
              onChange={(e) =>
                setPhone(
                  e.target.value.replace(/\D/g, "")
                )
              }
              required
            />
          </div>

          <div>
            <label
              htmlFor="edit-technician-email"
              className={ui.label}
            >
              Email (Optional)
            </label>

            <input
              id="edit-technician-email"
              type="email"
              className={ui.input}
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />
          </div>

          <div>
            <label className={ui.label}>
              New Login Password (Optional)
            </label>
            <input
              type="password"
              autoComplete="new-password"
              className={ui.input}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={ui.label}>
                Employee Code
              </label>

              <input
                className={`${ui.input} opacity-70`}
                value={technician.employeeCode}
                disabled
              />
            </div>

            <div>
              <label className={ui.label}>
                Vehicle Number
              </label>

              <input
                className={ui.input}
                value={vehicleNumber}
                onChange={(e) =>
                  setVehicleNumber(
                    e.target.value
                  )
                }
                placeholder="DL01AB1234"
              />
            </div>
          </div>

          <div>
            <label className={ui.label}>
              Skills
            </label>

            <input
              className={ui.input}
              value={skills}
              onChange={(e) =>
                setSkills(e.target.value)
              }
              placeholder="Cockroach, Termite, Rodent"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={ui.label}>
                Duty Status
              </label>

              <select
                className={ui.input}
                value={dutyStatus}
                onChange={(e) =>
                  setDutyStatus(
                    e.target.value as EditTechnicianFormData["dutyStatus"]
                  )
                }
              >
                {DUTY_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-3 pb-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) =>
                    setIsActive(
                      e.target.checked
                    )
                  }
                />

                <span className="text-sm">
                  Active Technician
                </span>
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
              <p className={ui.errorText}>
                {error}
              </p>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-3 border-t border-border-default pt-5">
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
                ? "Updating Technician..."
                : "Update Technician"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
