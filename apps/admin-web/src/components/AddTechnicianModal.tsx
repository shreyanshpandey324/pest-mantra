"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { UserRole } from "@/types/auth";
import { ui } from "@/lib/ui-classes";

interface AddTechnicianModalProps {
  onClose: () => void;
  onCreated: () => void;
}

interface Branch {
  _id: string;
  name: string;
  city: string;
  state: string;
  isActive: boolean;
  companyId?: string;
}

const PHONE_REGEX = /^[6-9]\d{9}$/;

export function AddTechnicianModal({
  onClose,
  onCreated,
}: AddTechnicianModalProps) {
  const firstInputRef =
    useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState("");

  const [branches, setBranches] = useState<Branch[]>(
    []
  );
  const [isLoadingBranches, setIsLoadingBranches] =
    useState(true);
  const [branchLoadError, setBranchLoadError] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  useEffect(() => {
    firstInputRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
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

  useEffect(() => {
    let cancelled = false;

    async function loadBranches() {
      setIsLoadingBranches(true);
      setBranchLoadError(null);

      try {
        const response = await fetch(
          "/api/companies/branches",
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          }
        );

        const json = await response.json();

        if (
          !response.ok ||
          !json.success
        ) {
          throw new Error(
            json.message ??
              "Unable to load branches."
          );
        }

        const loadedBranches: Branch[] =
          json.data?.branches ?? [];

        if (!cancelled) {
          const activeBranches =
            loadedBranches.filter(
              (branch) => branch.isActive
            );

          setBranches(activeBranches);

          if (activeBranches.length === 1) {
            setBranchId(
              activeBranches[0]._id
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setBranchLoadError(
            err instanceof Error
              ? err.message
              : "Unable to load branches."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingBranches(false);
        }
      }
    }

    loadBranches();

    return () => {
      cancelled = true;
    };
  }, []);

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

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (!branchId.trim()) {
      setError(
        "Please select a branch."
      );
      return;
    }

    if (isLoadingBranches) {
      setError(
        "Please wait while branches are loading."
      );
      return;
    }

    if (branches.length === 0) {
      setError(
        "No active branches are available."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/users",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim(),
            email:
              email.trim() || undefined,
            password,
            role: UserRole.TECHNICIAN,
            branchId,
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
            "Unable to create technician."
        );
        setIsSubmitting(false);
        return;
      }

      onCreated();
      onClose();
    } catch {
      setError(
        "Unable to connect to server."
      );
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pm-modal-backdrop p-4"
      onClick={onClose}
    >
      <div
        className={`${ui.card} max-h-[90vh] w-full max-w-[520px] overflow-y-auto p-7`}
        onClick={(e) =>
          e.stopPropagation()
        }
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
            <label
              htmlFor="technician-name"
              className={ui.label}
            >
              Full Name
            </label>

            <input
              id="technician-name"
              ref={firstInputRef}
              className={ui.input}
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Enter technician name"
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label
              htmlFor="technician-phone"
              className={ui.label}
            >
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
                setPhone(
                  e.target.value.replace(
                    /\D/g,
                    ""
                  )
                )
              }
              placeholder="9876543210"
              required
            />
          </div>

          <div>
            <label
              htmlFor="technician-email"
              className={ui.label}
            >
              Email (Optional)
            </label>

            <input
              id="technician-email"
              className={ui.input}
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="technician@pestmantra.in"
            />
          </div>

          <div>
            <label
              htmlFor="technician-password"
              className={ui.label}
            >
              Password
            </label>

            <input
              id="technician-password"
              className={ui.input}
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label
              htmlFor="technician-branch"
              className={ui.label}
            >
              Branch
            </label>

            {isLoadingBranches ? (
              <div
                className={`${ui.input} flex items-center text-ink-muted`}
              >
                Loading branches...
              </div>
            ) : branchLoadError ? (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
                <p className={ui.errorText}>
                  {branchLoadError}
                </p>

                <button
                  type="button"
                  className="mt-2 text-sm font-medium text-accent hover:underline"
                  onClick={() =>
                    window.location.reload()
                  }
                >
                  Reload
                </button>
              </div>
            ) : branches.length === 0 ? (
              <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
                <p className="text-sm text-warning">
                  No active branches are available.
                </p>
              </div>
            ) : (
              <select
                id="technician-branch"
                className={ui.input}
                value={branchId}
                onChange={(e) =>
                  setBranchId(e.target.value)
                }
                required
              >
                <option value="">
                  Select a branch
                </option>

                {branches.map((branch) => (
                  <option
                    key={branch._id}
                    value={branch._id}
                  >
                    {branch.name} —{" "}
                    {branch.city},{" "}
                    {branch.state}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
              <p className={ui.errorText}>
                {error}
              </p>
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
              disabled={
                isSubmitting ||
                isLoadingBranches ||
                branches.length === 0
              }
              aria-busy={isSubmitting}
            >
              {isSubmitting
                ? "Creating Technician..."
                : "Create Technician"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}