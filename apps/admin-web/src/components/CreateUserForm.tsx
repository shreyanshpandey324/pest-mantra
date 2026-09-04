"use client";

import { FormEvent, useMemo, useState } from "react";
import { USER_ROLE_LABELS, UserRole } from "@/types/auth";

export interface TeamBranchOption {
  _id: string;
  companyId?: string;
  name: string;
  city: string;
  state: string;
  isActive: boolean;
}

const PHONE_REGEX = /^[6-9]\d{9}$/;

export function CreateUserForm({
  currentRole,
  branches,
  branchesLoadError,
  onCreated,
}: {
  currentRole: UserRole;
  branches: TeamBranchOption[];
  branchesLoadError?: string | null;
  onCreated: (createdRole: UserRole) => Promise<void> | void;
}) {
  const allowedRoles = useMemo(
    () => currentRole === UserRole.SUPER_ADMIN
      ? [UserRole.TECHNICIAN, UserRole.OFFICE_ADMIN]
      : [UserRole.TECHNICIAN],
    [currentRole]
  );

  const activeBranches = useMemo(() => branches.filter((branch) => branch.isActive), [branches]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    role: allowedRoles[0],
    branchId: activeBranches.length === 1 ? activeBranches[0]._id : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-border-default bg-surface-2 px-3.5 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-success focus:ring-2 focus:ring-success/10 disabled:cursor-not-allowed disabled:opacity-50";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim().toLowerCase();

    if (name.length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (!PHONE_REGEX.test(phone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address or leave it blank.");
      return;
    }
    if (form.role === UserRole.OFFICE_ADMIN && form.password.length < 8) {
      setError("Office Admin password must be at least 8 characters.");
      return;
    }
    if (!form.branchId) {
      setError("Select an active branch.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email: email || undefined,
          password: form.role === UserRole.OFFICE_ADMIN ? form.password : undefined,
          role: form.role,
          branchId: form.branchId,
        }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Unable to create user.");
      }

      const createdRole = form.role;
      setForm({
        name: "",
        phone: "",
        email: "",
        password: "",
        role: allowedRoles[0],
        branchId: activeBranches.length === 1 ? activeBranches[0]._id : "",
      });
      setSuccess(`${USER_ROLE_LABELS[createdRole]} account created successfully.`);
      await onCreated(createdRole);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create user.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border-default bg-surface p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-success">Create user</p>
          <h2 className="mt-1 text-xl">Add a team account</h2>
          <p className="mt-1 text-sm text-ink-muted">Creates a real staff account. Office Admins sign in with registered mobile number + password.</p>
        </div>
        <span className="w-fit rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs text-success">Functional</span>
      </div>

      {branchesLoadError ? (
        <div className="mt-5 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          Branches could not be loaded: {branchesLoadError}
        </div>
      ) : null}

      {error ? <div className="mt-5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      {success ? <div className="mt-5 rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-sm text-success">{success}</div> : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-ink-muted">
          Full name
          <input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Team member name" required />
        </label>
        <label className="text-xs text-ink-muted">
          Mobile number
          <input className={inputClass} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, "").slice(0, 10) })} inputMode="numeric" placeholder="10-digit mobile" required />
        </label>
        <label className="text-xs text-ink-muted">
          Email <span className="text-ink-faint">(optional)</span>
          <input type="email" className={inputClass} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@company.com" />
        </label>
        {form.role === UserRole.OFFICE_ADMIN ? (
          <label className="text-xs text-ink-muted">
            Login password
            <input
              type="password"
              className={inputClass}
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
        ) : null}
        <label className="text-xs text-ink-muted">
          Role
          <select className={inputClass} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole, password: event.target.value === UserRole.OFFICE_ADMIN ? form.password : "" })}>
            {allowedRoles.map((role) => <option key={role} value={role}>{USER_ROLE_LABELS[role]}</option>)}
          </select>
        </label>
        <label className="text-xs text-ink-muted">
          Branch
          <select className={inputClass} value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })} disabled={activeBranches.length === 0} required>
            <option value="">Select branch</option>
            {activeBranches.map((branch) => (
              <option key={branch._id} value={branch._id}>{branch.name} — {branch.city}, {branch.state}</option>
            ))}
          </select>
        </label>
        <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-xs text-ink-muted">
          <p className="font-medium text-success">Login policy</p>
          <p className="mt-1 leading-5">Office Admins use their registered 10-digit mobile number and password. Technician field-app authentication can remain on the existing OTP flow for now.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-faint">
          {currentRole === UserRole.SUPER_ADMIN
            ? "Super Admin can create Office Admin and Technician accounts."
            : "Office Admin can create Technician accounts in their own branch only."}
        </p>
        <button
          type="submit"
          disabled={submitting || activeBranches.length === 0}
          className="rounded-xl bg-success px-5 py-2.5 text-sm font-semibold text-accent-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create account"}
        </button>
      </div>
    </form>
  );
}
