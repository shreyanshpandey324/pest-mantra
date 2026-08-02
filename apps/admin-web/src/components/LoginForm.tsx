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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedPhone = phone.trim();

    if (!PHONE_REGEX.test(trimmedPhone)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (password.length === 0) {
      setError("Enter your password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: trimmedPhone, password }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message ?? "Login failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Full navigation (not just router.push) so middleware and all
      // server components re-read the freshly-set session cookie
      // rather than relying on stale client-side router cache.
      router.replace(redirectTo);
      router.refresh();
    } catch {
      setError("Unable to reach the server. Check your connection and try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-1.5">
        <label className={ui.label} htmlFor="phone">
          Phone number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="9876543210"
          className={ui.input}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={10}
          required
          aria-describedby={error ? "login-error" : undefined}
          aria-invalid={!!error}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={ui.label} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className={ui.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          aria-describedby={error ? "login-error" : undefined}
          aria-invalid={!!error}
        />
      </div>

      <div role="status" aria-live="polite">
        {error && (
          <p id="login-error" className={ui.errorText}>
            {error}
          </p>
        )}
      </div>

      <button
        type="submit"
        className={ui.btnPrimary}
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
