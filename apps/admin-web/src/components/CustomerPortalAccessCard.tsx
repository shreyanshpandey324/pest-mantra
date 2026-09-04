"use client";

import { useEffect, useState } from "react";
import { CustomerPortalAccessStatus } from "@/types/customerPortal";

interface Props {
  projectId: string;
  customerName: string;
  customerPhone: string;
}

function fmt(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function CustomerPortalAccessCard({ projectId, customerName, customerPhone }: Props) {
  const [status, setStatus] = useState<CustomerPortalAccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/customer-portal/access/project/${encodeURIComponent(projectId)}`)
      .then(async (response) => {
        const json = (await response.json()) as { success?: boolean; data?: CustomerPortalAccessStatus; message?: string };
        if (!response.ok || !json.success || !json.data) throw new Error(json.message ?? "Could not load customer portal access.");
        if (active) setStatus(json.data);
      })
      .catch((caught) => active && setError(caught instanceof Error ? caught.message : "Could not load customer portal access."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [projectId]);

  async function issue() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/customer-portal/access/project/${encodeURIComponent(projectId)}`, { method: "POST" });
      const json = (await response.json()) as { success?: boolean; data?: CustomerPortalAccessStatus; message?: string };
      if (!response.ok || !json.success || !json.data) throw new Error(json.message ?? "Could not generate access code.");
      setStatus(json.data);
      setMessage("New access code generated. Copy it now — the full code is only returned at generation time.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate access code.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!window.confirm(`Revoke customer portal access for ${customerName}?`)) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/customer-portal/access/project/${encodeURIComponent(projectId)}`, { method: "DELETE" });
      const json = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !json.success) throw new Error(json.message ?? "Could not revoke access.");
      setStatus((current) => current ? { ...current, enabled: false, accessCode: undefined } : null);
      setMessage("Customer portal access revoked.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not revoke access.");
    } finally {
      setBusy(false);
    }
  }

  async function copyAccess() {
    if (!status?.accessCode) return;
    const base = window.location.origin;
    const text = [
      "Pest Mantra Customer Portal",
      `${base}/customer/login`,
      `Mobile: ${customerPhone}`,
      `Access code: ${status.accessCode}`,
      `Valid until: ${fmt(status.expiresAt)}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Portal link, mobile number and access code copied.");
    } catch {
      setError("Clipboard access is blocked by the browser. Copy the access code manually.");
    }
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-accent/20 bg-gradient-to-br from-accent/[0.08] via-surface to-surface shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
      <div className="border-b border-border-default/70 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Customer Portal Lite</p>
            <h2 className="mt-1 text-sm font-semibold text-ink">Secure self-service access</h2>
            <p className="mt-1 text-xs leading-5 text-ink-faint">Share one revocable code so the customer can view jobs, quotations, invoices, AMC and reports.</p>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${status?.enabled ? "border-success/20 bg-success/10 text-success" : "border-border-default bg-surface-2 text-ink-faint"}`}>
            {loading ? "Checking" : status?.enabled ? "Active" : "Disabled"}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border-default/70 bg-surface p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-faint">Customer</p>
            <p className="mt-2 text-sm font-semibold text-ink">{customerName}</p>
            <p className="mt-1 font-mono text-xs text-ink-muted">{customerPhone}</p>
          </div>
          <div className="rounded-2xl border border-border-default/70 bg-surface p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-faint">Access</p>
            <p className="mt-2 text-sm font-semibold text-ink">{status?.enabled ? `Code ending ••••${status.codeHint ?? ""}` : "No active code"}</p>
            <p className="mt-1 text-xs text-ink-muted">{status?.enabled ? `Valid until ${fmt(status.expiresAt)}` : "Generate a code when ready to share."}</p>
          </div>
        </div>

        {status?.accessCode ? (
          <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">New access code · copy now</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <code className="text-lg font-black tracking-[0.16em] text-ink">{status.accessCode}</code>
              <button type="button" onClick={copyAccess} className="h-10 rounded-xl bg-accent px-4 text-xs font-black text-accent-ink transition hover:bg-accent-hover">Copy access details</button>
            </div>
          </div>
        ) : null}

        {message ? <div className="rounded-xl border border-success/20 bg-success/10 px-3 py-2.5 text-xs text-success">{message}</div> : null}
        {error ? <div className="rounded-xl border border-danger/20 bg-danger/10 px-3 py-2.5 text-xs text-danger">{error}</div> : null}

        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || loading} onClick={issue} className="h-10 rounded-xl bg-accent px-4 text-xs font-bold text-accent-ink transition hover:bg-accent-hover disabled:opacity-50">
            {busy ? "Working…" : status?.enabled ? "Regenerate code" : "Enable customer portal"}
          </button>
          {status?.enabled ? (
            <button type="button" disabled={busy} onClick={revoke} className="h-10 rounded-xl border border-danger/30 bg-danger/5 px-4 text-xs font-bold text-danger transition hover:bg-danger/10 disabled:opacity-50">Revoke access</button>
          ) : null}
          <a href="/customer/login" target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-xl border border-border-default bg-surface px-4 text-xs font-bold text-ink-muted transition hover:text-ink">Preview login ↗</a>
        </div>

        <p className="text-[11px] leading-5 text-ink-faint">Security: the full access code is never stored in readable form. Regenerating immediately invalidates the previous code; revocation also invalidates active portal sessions.</p>
      </div>
    </div>
  );
}
