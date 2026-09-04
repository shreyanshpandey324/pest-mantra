"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function CustomerPortalLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/customer-portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), accessCode: accessCode.trim() }),
      });
      const json = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !json.success) throw new Error(json.message ?? "Could not sign in.");
      router.replace("/customer/portal");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="customer-phone" className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Mobile number</label>
        <input
          id="customer-phone"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="10-digit mobile number"
          className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/70 focus:bg-white/[0.08]"
        />
      </div>

      <div>
        <label htmlFor="customer-code" className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Customer access code</label>
        <input
          id="customer-code"
          autoComplete="one-time-code"
          value={accessCode}
          onChange={(event) => setAccessCode(event.target.value.toUpperCase().slice(0, 24))}
          placeholder="XXXX-XXXX-XXXX"
          className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 font-mono text-sm uppercase tracking-[0.16em] text-white outline-none transition placeholder:tracking-normal placeholder:text-slate-600 focus:border-emerald-400/70 focus:bg-white/[0.08]"
        />
        <p className="mt-2 text-xs leading-5 text-slate-500">Use the access code shared by your Pest Mantra office. For security, codes can be revoked or regenerated at any time.</p>
      </div>

      {error ? <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

      <button
        type="submit"
        disabled={loading || phone.length !== 10 || accessCode.trim().length < 8}
        className="h-12 w-full rounded-2xl bg-emerald-400 text-sm font-black text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Opening your portal…" : "Open customer portal"}
      </button>
    </form>
  );
}
