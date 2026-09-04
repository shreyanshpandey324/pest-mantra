"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthUser, USER_ROLE_LABELS, UserRole } from "@/types/auth";

export function AdminAccountsPanel({ refreshVersion = 0 }: { refreshVersion?: number }) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [resetId, setResetId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/users", { cache: "no-store", credentials: "same-origin" });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.message || "Could not load admin accounts.");
      const rows = (json.data?.users ?? []) as AuthUser[];
      setUsers(rows.filter((user) => user.role !== UserRole.TECHNICIAN));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load admin accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshVersion]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) =>
      user.name.toLowerCase().includes(needle) ||
      user.phone.includes(needle) ||
      (user.email ?? "").toLowerCase().includes(needle) ||
      USER_ROLE_LABELS[user.role].toLowerCase().includes(needle)
    );
  }, [query, users]);

  async function savePassword(user: AuthUser) {
    if (user.role !== UserRole.OFFICE_ADMIN) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/users/${user._id}/password`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) throw new Error(json?.message || "Could not update password.");
      setSuccess(`Password updated for ${user.name}.`);
      setResetId(null);
      setPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-success/20 bg-surface">
      <div className="border-b border-border-default bg-gradient-to-r from-success/10 via-surface to-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-success">Admin access</p>
            <h2 className="mt-2 text-xl">Registered admin accounts</h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-muted">
              Super Admin and Office Admin accounts sign in with their registered mobile number and password.
              Existing Office Admin passwords can be reset here.
            </p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-border-default bg-surface-2 px-3.5 py-2 text-xs text-ink-muted transition hover:border-success/35 hover:text-success disabled:opacity-50">
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search admin name, phone or email…"
          className="mt-4 h-10 w-full rounded-xl border border-border-default bg-surface-2 px-3.5 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-success focus:ring-2 focus:ring-success/10 sm:max-w-md"
        />
      </div>

      {error ? <div className="m-5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      {success ? <div className="m-5 rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-sm text-success">{success}</div> : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-surface-2/60 text-xs uppercase tracking-wider text-ink-faint">
            <tr>
              <th className="px-5 py-3 font-medium">Account</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Password</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {loading && users.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-ink-muted">Loading admin accounts…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-ink-muted">No matching admin accounts.</td></tr>
            ) : filtered.map((user) => (
              <tr key={user._id} className="align-top transition hover:bg-surface-2/35">
                <td className="px-5 py-4">
                  <p className="font-medium text-ink">{user.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-ink-muted">+91 {user.phone}</p>
                  {user.email ? <p className="mt-0.5 text-xs text-ink-faint">{user.email}</p> : null}
                </td>
                <td className="px-5 py-4 text-xs text-ink-muted">{USER_ROLE_LABELS[user.role]}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs ${user.isActive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  {user.role === UserRole.OFFICE_ADMIN ? (
                    resetId === user._id ? (
                      <div className="flex min-w-[280px] gap-2">
                        <input
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          minLength={8}
                          autoComplete="new-password"
                          placeholder="New password"
                          className="h-9 min-w-0 flex-1 rounded-lg border border-border-default bg-surface-2 px-3 text-xs text-ink outline-none focus:border-success"
                        />
                        <button type="button" disabled={saving} onClick={() => void savePassword(user)} className="rounded-lg bg-success px-3 py-2 text-xs font-semibold text-accent-ink disabled:opacity-50">
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button type="button" disabled={saving} onClick={() => { setResetId(null); setPassword(""); }} className="rounded-lg border border-border-default px-3 py-2 text-xs text-ink-muted disabled:opacity-50">Cancel</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setResetId(user._id); setPassword(""); setError(null); setSuccess(null); }} className="rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-xs font-semibold text-success transition hover:bg-success/15">
                        Set / reset password
                      </button>
                    )
                  ) : (
                    <span className="text-xs text-ink-faint">Managed by Super Admin seed credentials</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
