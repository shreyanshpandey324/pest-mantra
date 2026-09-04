"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-classes";

interface LoginFormProps {
  redirectTo: string;
}

const PHONE_REGEX = /^[6-9]\d{9}$/;

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitCredentials(loginPhone: string, loginPassword: string) {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loginPhone, password: loginPassword }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message ?? "Login failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError("Unable to reach the server. Check your connection and try again.");
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedPhone = phone.trim();
    if (!PHONE_REGEX.test(trimmedPhone)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (password.length === 0) {
      setError("Enter your password.");
      return;
    }
    await submitCredentials(trimmedPhone, password);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="login-form flex flex-col gap-[18px]">
      <div className="flex flex-col gap-1.5">
        <label className={ui.label} htmlFor="phone">Mobile number</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-faint" aria-hidden="true">☎</span>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="9876543210"
            className={`login-input ${ui.input} pl-10`}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={10}
            required
            aria-describedby={error ? "login-error" : undefined}
            aria-invalid={!!error}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={ui.label} htmlFor="password">Password</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-faint" aria-hidden="true">⌑</span>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter password"
            className={`login-input ${ui.input} pl-10 pr-16`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-describedby={error ? "login-error" : undefined}
            aria-invalid={!!error}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-muted hover:text-accent"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div role="status" aria-live="polite">
        {error ? <p id="login-error" className="rounded-xl border border-danger/20 bg-danger/5 px-3.5 py-2.5 text-[13px] font-medium text-danger">{error}</p> : null}
      </div>

      <button type="submit" className={`login-submit ${ui.btnPrimary} w-full`} disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Login"}
        {!isSubmitting ? <span aria-hidden="true">→</span> : null}
      </button>

      <p className="text-center text-xs text-ink-faint">Password help is managed by your authorized administrator.</p>
    </form>
  );
}
