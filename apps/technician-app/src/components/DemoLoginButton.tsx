"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DemoLoginButtonProps {
  redirectTo: string;
}

export function DemoLoginButton({ redirectTo }: DemoLoginButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enterDemo() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/demo", { method: "POST" });
      const json = await response.json().catch(() => null);
      if (!response.ok || !json?.success) {
        setError(json?.message ?? "Unable to start demo mode.");
        return;
      }

      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError("Unable to start demo mode. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Company Demo Mode</p>
        <p className="mt-1 text-sm text-ink-muted">OTP and mobile verification are disabled for local testing.</p>
      </div>

      {error ? (
        <div role="alert" className="rounded-xl border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={enterDemo}
        disabled={loading}
        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-ink shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Opening demo…" : "Open Technician App"}
      </button>

      <p className="text-center text-xs text-ink-muted">No phone number, OTP or Firebase SMS required in demo mode.</p>
    </div>
  );
}
