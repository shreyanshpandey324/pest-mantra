"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthUser, USER_ROLE_LABELS, UserRole } from "@/types/auth";

export function OtpAccessPanel({
  currentRole,
  refreshVersion = 0,
}: {
  currentRole: UserRole;
  refreshVersion?: number;
}) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/users", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Could not load OTP access list.");
      }
      setUsers(json.data?.users ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load OTP access list.");
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

  const enabledCount = users.filter((user) => user.isActive && user.otpLoginEnabled).length;

  async function toggle(user: AuthUser) {
    if (currentRole !== UserRole.SUPER_ADMIN) return;
    setSavingId(user._id);
    setError(null);
    try {
      const response = await fetch(`/api/users/${user._id}/otp-access`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !user.otpLoginEnabled }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Could not update OTP access.");
      }
      const updated = json.data?.user as AuthUser | undefined;
      setUsers((current) =>
        current.map((row) =>
          row._id === user._id
            ? updated ?? { ...row, otpLoginEnabled: !row.otpLoginEnabled }
            : row
        )
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update OTP access.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-success/20 bg-surface">
      <div className="border-b border-border-default bg-gradient-to-r from-success/10 via-surface to-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_12px_rgba(61,220,132,.75)]" />
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-success">OTP access control</p>
            </div>
            <h2 className="mt-2 text-xl">Approved login numbers</h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-muted">
              A phone number can sign in only when the account is active and OTP access is explicitly enabled.
              {currentRole === UserRole.SUPER_ADMIN
                ? " Only Super Admin can change this whitelist."
                : " Contact a Super Admin to change this whitelist."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-xs text-success">
              {enabledCount} approved
            </span>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="rounded-xl border border-border-default bg-surface-2 px-3.5 py-2 text-xs text-ink-muted transition hover:border-success/35 hover:text-success disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
        <div className="mt-4">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, phone, email or role…"
            className="h-10 w-full rounded-xl border border-border-default bg-surface-2 px-3.5 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-success focus:ring-2 focus:ring-success/10 sm:max-w-md"
          />
        </div>
      </div>

      {error ? (
        <div className="m-5 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-surface-2/60 text-xs uppercase tracking-wider text-ink-faint">
            <tr>
              <th className="px-5 py-3 font-medium">Account</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">OTP Login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {loading && users.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-ink-muted">Loading approved-access roster…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-ink-muted">No matching accounts.</td></tr>
            ) : filtered.map((user) => (
              <tr key={user._id} className="transition hover:bg-surface-2/35">
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
                  {currentRole === UserRole.SUPER_ADMIN ? (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={user.otpLoginEnabled}
                      disabled={savingId === user._id || (!user.isActive && !user.otpLoginEnabled)}
                      onClick={() => void toggle(user)}
                      className={`inline-flex min-w-[112px] items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        user.otpLoginEnabled
                          ? "border-success/30 bg-success/10 text-success hover:bg-success/15"
                          : "border-border-default bg-surface-2 text-ink-muted hover:border-success/30 hover:text-success"
                      }`}
                    >
                      {savingId === user._id ? "Saving…" : user.otpLoginEnabled ? "Approved" : "Blocked"}
                    </button>
                  ) : (
                    <span className={`rounded-full px-2.5 py-1 text-xs ${user.otpLoginEnabled ? "bg-success/10 text-success" : "bg-surface-2 text-ink-faint"}`}>
                      {user.otpLoginEnabled ? "Approved" : "Blocked"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border-default bg-surface-2/30 px-5 py-3 text-xs text-ink-faint">
        New staff accounts are blocked from OTP login by default. Super Admin approval is required before first sign-in.
      </div>
    </section>
  );
}
