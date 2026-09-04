"use client";

import { FormEvent, useEffect, useState } from "react";
import { CreateUserForm, TeamBranchOption } from "@/components/CreateUserForm";
import { LogoutButton } from "@/components/LogoutButton";
import { AdminAccountsPanel } from "@/components/AdminAccountsPanel";
import { USER_ROLE_LABELS, UserRole } from "@/types/auth";
import { TechnicianListItem } from "@/types/project";

export type SettingsData = {
  account: { id: string; name: string; phone: string; email: string; role: UserRole; isActive: boolean };
  company: { id: string; name: string; phone: string; email: string; status: string; isActive: boolean } | null;
  branch: { id: string; name: string; city: string; state: string; isActive: boolean } | null;
  notifications: { emailNotifications: boolean; projectNotifications: boolean; systemNotifications: boolean };
};

type Notice = { type: "ok" | "error"; text: string } | null;
type SettingsSection = "profile" | "team" | "preferences" | "security";
type ThemePreference = "dark" | "light" | "system";

const PHONE_REGEX = /^[6-9]\d{9}$/;

export function SettingsView({
  initial,
  initialTechnicians,
  techniciansLoadError,
  branches,
  branchesLoadError,
}: {
  initial: SettingsData;
  initialTechnicians: TechnicianListItem[];
  techniciansLoadError?: string | null;
  branches: TeamBranchOption[];
  branchesLoadError?: string | null;
}) {
  const [section, setSection] = useState<SettingsSection>("profile");
  const [account, setAccount] = useState(initial.account);
  const [notifications, setNotifications] = useState(initial.notifications);
  const [technicians, setTechnicians] = useState(initialTechnicians);
  const [teamError, setTeamError] = useState<string | null>(techniciansLoadError ?? null);
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [teamRefreshVersion, setTeamRefreshVersion] = useState(0);
  const [themePreference, setThemePreference] = useState<ThemePreference>("light");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    const stored = window.localStorage.getItem("pest-mantra-theme");
    const preference: ThemePreference = stored === "dark" || stored === "system" ? stored : "light";
    setThemePreference(preference);

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const syncSystemTheme = () => {
      if ((window.localStorage.getItem("pest-mantra-theme") ?? "light") === "system") {
        document.documentElement.dataset.theme = media.matches ? "light" : "dark";
      }
    };
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, []);

  function applyTheme(preference: ThemePreference) {
    setThemePreference(preference);
    window.localStorage.setItem("pest-mantra-theme", preference);
    const resolved = preference === "system"
      ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : preference;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = preference;
  }

  const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-border-default bg-surface-2 px-3.5 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-success focus:ring-2 focus:ring-success/10";

  async function patch(path: string, body: unknown) {
    const response = await fetch(path, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || json?.success === false) throw new Error(json?.message || "Something went wrong.");
    return json;
  }

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const name = account.name.trim();
    const phone = account.phone.trim();
    const email = account.email.trim().toLowerCase();
    if (name.length < 2) return setNotice({ type: "error", text: "Name must be at least 2 characters." });
    if (!PHONE_REGEX.test(phone)) return setNotice({ type: "error", text: "Enter a valid 10-digit Indian mobile number." });
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return setNotice({ type: "error", text: "Enter a valid email address." });

    setSaving("account");
    try {
      await patch("/api/settings/account", { name, phone, email });
      setAccount({ ...account, name, phone, email });
      setNotice({ type: "ok", text: "Profile updated successfully." });
    } catch (caught) {
      setNotice({ type: "error", text: caught instanceof Error ? caught.message : "Could not update profile." });
    } finally {
      setSaving(null);
    }
  }

  async function saveNotifications() {
    setSaving("notifications");
    setNotice(null);
    try {
      await patch("/api/settings/notifications", notifications);
      setNotice({ type: "ok", text: "Notification preferences saved." });
    } catch (caught) {
      setNotice({ type: "error", text: caught instanceof Error ? caught.message : "Could not save preferences." });
    } finally {
      setSaving(null);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (!passwordForm.currentPassword) {
      setNotice({ type: "error", text: "Enter your current password." });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setNotice({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setNotice({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    setSaving("password");
    try {
      await patch("/api/settings/password", passwordForm);
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => null);
      window.location.assign("/login?passwordChanged=1");
    } catch (caught) {
      setNotice({ type: "error", text: caught instanceof Error ? caught.message : "Could not change password." });
      setSaving(null);
    }
  }

  async function refreshTechnicians() {
    setTeamError(null);
    try {
      const response = await fetch("/api/technicians", { cache: "no-store", credentials: "same-origin" });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.message || "Could not refresh technician roster.");
      setTechnicians(json.data?.technicians ?? []);
    } catch (caught) {
      setTeamError(caught instanceof Error ? caught.message : "Could not refresh technician roster.");
    }
  }

  async function toggleTechnician(technician: TechnicianListItem) {
    setSaving(`tech-${technician.id}`);
    setTeamError(null);
    try {
      await patch(`/api/users/${technician.id}`, {
        name: technician.name,
        phone: technician.phone,
        email: technician.email || undefined,
        branchId: technician.branchId,
        isActive: !technician.isActive,
      });
      setTechnicians((current) => current.map((row) => row.id === technician.id ? { ...row, isActive: !row.isActive } : row));
      setTeamRefreshVersion((value) => value + 1);
    } catch (caught) {
      setTeamError(caught instanceof Error ? caught.message : "Could not update technician status.");
    } finally {
      setSaving(null);
    }
  }

  const activeTechnicians = technicians.filter((technician) => technician.isActive).length;
  const onDutyTechnicians = technicians.filter((technician) => technician.isActive && technician.dutyStatus !== "off_duty").length;
  const manageableBranches = account.role === UserRole.OFFICE_ADMIN && initial.branch
    ? branches.filter((branch) => branch._id === initial.branch?.id)
    : branches;

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_14px_rgba(61,220,132,.75)]" />
            <p className="font-mono text-xs uppercase tracking-[.2em] text-success">Control center</p>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">Real account, team, notification and security controls backed by existing APIs.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border-default bg-surface px-3 py-2 text-xs text-ink-muted">
          <span className={`h-2 w-2 rounded-full ${account.isActive ? "bg-success" : "bg-danger"}`} />
          {USER_ROLE_LABELS[account.role]}
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-border-default bg-surface p-2">
        {([
          ["profile", "Profile & workspace"],
          ["team", "Team management"],
          ["preferences", "Preferences"],
          ["security", "Security"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setSection(key);
              setNotice(null);
            }}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm transition ${section === key ? "bg-success text-accent-ink font-semibold" : "text-ink-muted hover:bg-surface-2 hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {notice ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${notice.type === "ok" ? "border-success/25 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"}`}>
          {notice.text}
        </div>
      ) : null}

      {section === "profile" ? (
        <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <section className="rounded-2xl border border-border-default bg-surface p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-success">Profile</p>
                <h2 className="mt-1 text-xl">Personal information</h2>
                <p className="mt-1 text-sm text-ink-muted">Updates the current signed-in user through /settings/account.</p>
              </div>
              <span className="rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs text-success">Functional</span>
            </div>
            <form onSubmit={saveAccount} className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs text-ink-muted">Full name<input className={inputClass} value={account.name} onChange={(event) => setAccount({ ...account, name: event.target.value })} required /></label>
              <label className="text-xs text-ink-muted">Phone<input className={inputClass} value={account.phone} onChange={(event) => setAccount({ ...account, phone: event.target.value.replace(/\D/g, "").slice(0, 10) })} inputMode="numeric" required /></label>
              <label className="text-xs text-ink-muted sm:col-span-2">Email<input type="email" className={inputClass} value={account.email} onChange={(event) => setAccount({ ...account, email: event.target.value })} placeholder="name@company.com" /></label>
              <div className="flex items-center justify-between gap-3 border-t border-border-default pt-4 sm:col-span-2">
                <div><p className="text-xs text-ink-faint">Access level</p><p className="text-sm font-medium">{USER_ROLE_LABELS[account.role]}</p></div>
                <button disabled={saving === "account"} className="rounded-xl bg-success px-5 py-2.5 text-sm font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-50">{saving === "account" ? "Saving…" : "Save profile"}</button>
              </div>
            </form>
          </section>

          <section className="relative overflow-hidden rounded-2xl border border-success/20 bg-gradient-to-br from-success/10 via-surface to-surface p-5 sm:p-6">
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-success/10 blur-3xl" />
            <p className="text-xs font-medium uppercase tracking-wider text-success">Workspace</p>
            <h2 className="mt-1 text-xl">{initial.company?.name || "Global workspace"}</h2>
            <p className="mt-1 text-sm text-ink-muted">Company and branch values come from the authenticated account scope.</p>
            <div className="mt-5 space-y-3 text-sm">
              <div className="rounded-xl border border-border-default bg-canvas/30 p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-ink-faint">Company</p><p className="mt-1 font-medium">{initial.company?.name || "Not assigned"}</p></div><span className="rounded-full border border-border-default px-2 py-1 text-[10px] uppercase tracking-wider text-ink-faint">Managed in Companies</span></div>
                {initial.company?.email ? <p className="mt-2 text-xs text-ink-muted">{initial.company.email}</p> : null}
                {initial.company?.phone ? <p className="mt-1 text-xs text-ink-muted">{initial.company.phone}</p> : null}
              </div>
              <div className="rounded-xl border border-border-default bg-canvas/30 p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-ink-faint">Branch</p><p className="mt-1 font-medium">{initial.branch?.name || "All branches / none assigned"}</p></div><span className="rounded-full border border-border-default px-2 py-1 text-[10px] uppercase tracking-wider text-ink-faint">Managed in Companies</span></div>
                {initial.branch ? <p className="mt-2 text-xs text-ink-muted">{initial.branch.city}, {initial.branch.state}</p> : null}
              </div>
            </div>
            <p className="mt-4 text-xs text-ink-faint">Workspace editing is intentionally kept in the existing Companies / Branches module rather than duplicated here.</p>
          </section>
        </div>
      ) : null}

      {section === "team" ? (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-3">
            <TeamStat label="Technicians" value={technicians.length} sub="Visible roster" />
            <TeamStat label="Active" value={activeTechnicians} sub="Enabled accounts" />
            <TeamStat label="On duty" value={onDutyTechnicians} sub="Current duty state" />
          </section>

          <CreateUserForm
            currentRole={account.role}
            branches={manageableBranches}
            branchesLoadError={branchesLoadError}
            onCreated={async () => {
              await refreshTechnicians();
              setTeamRefreshVersion((value) => value + 1);
            }}
          />

          {account.role === UserRole.SUPER_ADMIN ? (
            <AdminAccountsPanel refreshVersion={teamRefreshVersion} />
          ) : null}

          <section className="overflow-hidden rounded-2xl border border-border-default bg-surface">
            <div className="flex flex-col gap-3 border-b border-border-default p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-success">Team management</p>
                <h2 className="mt-1 text-xl">Technician roster</h2>
                <p className="mt-1 text-sm text-ink-muted">The backend currently exposes GET /technicians, so this roster is technicians only.</p>
              </div>
              <button type="button" onClick={refreshTechnicians} className="w-fit rounded-xl border border-border-default bg-surface-2 px-4 py-2 text-sm text-ink-muted transition hover:border-success/40 hover:text-success">Refresh</button>
            </div>

            {teamError ? <div className="m-5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{teamError}</div> : null}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-surface-2/60 text-xs uppercase tracking-wider text-ink-faint">
                  <tr><th className="px-5 py-3 font-medium">Technician</th><th className="px-5 py-3 font-medium">Employee</th><th className="px-5 py-3 font-medium">Duty</th><th className="px-5 py-3 font-medium">Branch</th><th className="px-5 py-3 font-medium">Account</th></tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {technicians.length > 0 ? technicians.map((technician) => (
                    <tr key={technician.id} className="transition hover:bg-surface-2/35">
                      <td className="px-5 py-4"><p className="font-medium">{technician.name}</p><p className="mt-0.5 text-xs text-ink-muted">{technician.phone}{technician.email ? ` · ${technician.email}` : ""}</p></td>
                      <td className="px-5 py-4 font-mono text-xs text-ink-muted">{technician.employeeCode}</td>
                      <td className="px-5 py-4"><span className="rounded-full border border-border-default px-2.5 py-1 text-xs capitalize text-ink-muted">{technician.dutyStatus.replaceAll("_", " ")}</span></td>
                      <td className="px-5 py-4 font-mono text-xs text-ink-muted">{technician.branchId || "—"}</td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          disabled={saving === `tech-${technician.id}`}
                          onClick={() => toggleTechnician(technician)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${technician.isActive ? "border-success/25 bg-success/10 text-success hover:bg-success/15" : "border-border-default bg-surface-2 text-ink-muted hover:border-success/30"}`}
                        >
                          {saving === `tech-${technician.id}` ? "Saving…" : technician.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-muted">No technicians are available in your current scope.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {section === "preferences" ? (
        <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
          <section className="rounded-2xl border border-border-default bg-surface p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wider text-success">Notifications</p><h2 className="mt-1 text-xl">Stay in the loop</h2><p className="mt-1 text-sm text-ink-muted">Saved through the existing notification settings endpoint.</p></div><span className="rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs text-success">Functional</span></div>
            <div className="mt-5 divide-y divide-border-default">
              {([
                ["emailNotifications", "Email notifications", "Account and operational updates by email"],
                ["projectNotifications", "Project activity", "Assignment and project status changes"],
                ["systemNotifications", "System alerts", "Important platform and security notices"],
              ] as const).map(([key, title, description]) => (
                <div key={key} className="flex items-center justify-between gap-4 py-4">
                  <div><p className="text-sm font-medium">{title}</p><p className="mt-0.5 text-xs text-ink-muted">{description}</p></div>
                  <button type="button" role="switch" aria-checked={notifications[key]} aria-label={`Toggle ${title}`} onClick={() => setNotifications({ ...notifications, [key]: !notifications[key] })} className={`relative h-7 w-12 shrink-0 rounded-full transition ${notifications[key] ? "bg-success" : "border border-border-strong bg-surface-2"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${notifications[key] ? "left-6" : "left-1"}`} /></button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end"><button onClick={saveNotifications} disabled={saving === "notifications"} className="rounded-xl border border-success/30 bg-success/10 px-5 py-2.5 text-sm font-semibold text-success transition hover:bg-success/15 disabled:opacity-50">{saving === "notifications" ? "Saving…" : "Save preferences"}</button></div>
          </section>

          <section className="rounded-2xl border border-border-default bg-surface p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wider text-success">Appearance</p><h2 className="mt-1 text-xl">Theme preference</h2><p className="mt-1 text-sm text-ink-muted">Saved locally on this browser and applied across the admin console.</p></div><span className="rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs text-success">Functional</span></div>
            <div className="mt-5 grid gap-3">
              {([
                ["light", "Light", "Recommended office-friendly theme"],
                ["dark", "Dark", "Low-light field-console theme"],
                ["system", "System", "Follow this device appearance"],
              ] as const).map(([value, label, description]) => (
                <button key={value} type="button" onClick={() => applyTheme(value)} className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${themePreference === value ? "border-success/35 bg-success/10" : "border-border-default bg-surface-2/35 hover:border-success/25"}`}>
                  <div><p className="text-sm font-medium">{label}</p><p className="mt-0.5 text-xs text-ink-muted">{description}</p></div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${themePreference === value ? "bg-success text-accent-ink" : "border border-border-default text-ink-faint"}`}>{themePreference === value ? "Active" : "Choose"}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {section === "security" ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_.8fr]">
          <section className="rounded-2xl border border-border-default bg-surface p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-success">Security</p>
                <h2 className="mt-1 text-xl">Mobile number + password</h2>
                <p className="mt-1 text-sm text-ink-muted">Super Admin and Office Admin use their registered 10-digit mobile number and password to access the admin dashboard.</p>
              </div>
              <span className="rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs text-success">Active</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <SecurityFact label="Login ID" value="Registered mobile" />
              <SecurityFact label="Protection" value="Rate limit + lockout" />
              <SecurityFact label="Session" value="JWT access + refresh" />
            </div>

            <form onSubmit={changePassword} className="mt-6 border-t border-border-default pt-5">
              <div>
                <p className="text-sm font-medium">Change your password</p>
                <p className="mt-1 text-xs text-ink-muted">Changing the password revokes active refresh sessions and requires a fresh sign-in.</p>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-xs text-ink-muted sm:col-span-2">
                  Current password
                  <input type="password" autoComplete="current-password" className={inputClass} value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} required />
                </label>
                <label className="text-xs text-ink-muted">
                  New password
                  <input type="password" autoComplete="new-password" minLength={8} className={inputClass} value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} required />
                </label>
                <label className="text-xs text-ink-muted">
                  Confirm password
                  <input type="password" autoComplete="new-password" minLength={8} className={inputClass} value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} required />
                </label>
              </div>
              <div className="mt-4 flex justify-end">
                <button type="submit" disabled={saving === "password"} className="rounded-xl bg-success px-5 py-2.5 text-sm font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-50">
                  {saving === "password" ? "Updating…" : "Update password"}
                </button>
              </div>
            </form>
          </section>

          <div className="space-y-5">
            <section className="rounded-2xl border border-border-default bg-surface p-5 sm:p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-success">Session</p><h2 className="mt-1 text-xl">Sign out securely</h2><p className="mt-2 text-sm text-ink-muted">Ends the current admin session using the existing logout flow.</p><div className="mt-5"><LogoutButton /></div>
            </section>
            <section className="rounded-2xl border border-border-default bg-surface p-5">
              <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium">Account status</p><p className="mt-1 text-xs text-ink-muted">Current backend account state</p></div><span className={`rounded-full px-3 py-1 text-xs ${account.isActive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>{account.isActive ? "Active" : "Inactive"}</span></div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TeamStat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return <div className="rounded-2xl border border-border-default bg-surface p-5"><p className="text-sm text-ink-muted">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-ink-faint">{sub}</p></div>;
}

function SecurityFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border-default bg-surface-2/40 p-4"><p className="text-xs text-ink-faint">{label}</p><p className="mt-1 text-sm font-medium text-ink">{value}</p></div>;
}
