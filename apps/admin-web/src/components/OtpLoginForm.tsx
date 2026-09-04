"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
} from "firebase/auth";
import { firebaseApp, firebaseAuth, firebaseConfigured } from "@/lib/firebase";
import { ui } from "@/lib/ui-classes";

const PHONE_REGEX = /^[6-9]\d{9}$/;
const OTP_REGEX = /^\d{6}$/;
const RESEND_SECONDS = 45;

interface OtpLoginFormProps {
  redirectTo: string;
}

// Always log the REAL Firebase error (code + message + which project this
// client is bound to) so it shows up in the browser console. The on-screen
// message stays friendly, but the console line is what you need to
// actually diagnose "operation-not-allowed" vs a genuine config mismatch.
function logFirebaseError(context: "send-otp" | "verify-otp", error: unknown) {
  const code = typeof error === "object" && error && "code" in error
    ? String((error as { code?: string }).code ?? "")
    : "";
  const message = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.log(`[firebase-otp] ${context} failed`, {
    code,
    message,
    projectId: firebaseApp?.options?.projectId,
    authDomain: firebaseApp?.options?.authDomain,
  });
  return code;
}

function firebaseErrorMessage(error: unknown, context: "send-otp" | "verify-otp"): string {
  const code = logFirebaseError(context, error);

  switch (code) {
    case "auth/invalid-phone-number":
      return "Enter a valid Indian mobile number.";
    case "auth/too-many-requests":
      return "Too many OTP requests. Please wait a while before trying again.";
    case "auth/quota-exceeded":
      return "SMS quota is currently unavailable. Contact your administrator.";
    case "auth/invalid-verification-code":
      return "That OTP is incorrect. Check the code and try again.";
    case "auth/code-expired":
      return "That OTP has expired. Request a new code.";
    case "auth/captcha-check-failed":
      return "Security verification failed. Refresh the page and try again.";
    case "auth/operation-not-allowed":
      return "Phone OTP is not enabled in Firebase Authentication yet.";
    case "auth/invalid-api-key":
      return "Firebase Web configuration is missing or invalid.";
    default:
      return code
        ? `OTP authentication failed (${code}). Please try again.`
        : "OTP authentication failed. Please try again.";
  }
}

export function OtpLoginForm({ redirectTo }: OtpLoginFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => () => recaptchaRef.current?.clear(), []);

  async function checkEligibility(targetPhone: string): Promise<boolean> {
    const response = await fetch("/api/auth/otp/eligibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: targetPhone }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.success) {
      setError(json?.message ?? "This phone number is not approved for OTP login.");
      return false;
    }
    return true;
  }

  async function sendOtp(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError(null);
    setNotice(null);

    const normalizedPhone = phone.replace(/\D/g, "").slice(0, 10);
    setPhone(normalizedPhone);
    if (!PHONE_REGEX.test(normalizedPhone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    if (!firebaseConfigured || !firebaseAuth) {
      setError("Firebase Phone OTP is not configured on this app yet.");
      return;
    }

    setSubmitting(true);
    try {
      const eligible = await checkEligibility(normalizedPhone);
      if (!eligible) return;

      recaptchaRef.current?.clear();
      recaptchaRef.current = new RecaptchaVerifier(firebaseAuth, "otp-recaptcha-container", {
        size: "invisible",
      });

      confirmationRef.current = await signInWithPhoneNumber(
        firebaseAuth,
        `+91${normalizedPhone}`,
        recaptchaRef.current
      );
      setOtp("");
      setStep("otp");
      setCooldown(RESEND_SECONDS);
      setNotice(`OTP sent to +91 ${normalizedPhone.slice(0, 5)} ${normalizedPhone.slice(5)}.`);
    } catch (caught) {
      setError(firebaseErrorMessage(caught, "send-otp"));
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!OTP_REGEX.test(otp)) {
      setError("Enter the 6-digit OTP sent to your phone.");
      return;
    }
    if (!confirmationRef.current) {
      setError("Request a fresh OTP before verifying.");
      setStep("phone");
      return;
    }

    setSubmitting(true);
    try {
      const credential = await confirmationRef.current.confirm(otp);
      const idToken = await credential.user.getIdToken(true);

      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const json = await response.json().catch(() => null);

      if (!response.ok || !json?.success) {
        setError(json?.message ?? "OTP sign-in failed. Please try again.");
        return;
      }

      if (firebaseAuth) {
        await signOut(firebaseAuth).catch(() => undefined);
      }
      router.replace(redirectTo);
      router.refresh();
    } catch (caught) {
      setError(firebaseErrorMessage(caught, "verify-otp"));
    } finally {
      setSubmitting(false);
    }
  }

  function changeNumber() {
    confirmationRef.current = null;
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
    setOtp("");
    setError(null);
    setNotice(null);
    setStep("phone");
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-success/20 bg-success/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_12px_rgba(61,220,132,.7)]" />
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-success">Approved phone access</p>
        </div>
        <p className="mt-2 text-xs leading-5 text-ink-muted">
          Only mobile numbers explicitly enabled by a Super Admin can receive access to this console.
        </p>
      </div>

      {step === "phone" ? (
        <form onSubmit={sendOtp} className="space-y-4" noValidate>
          <label className="block">
            <span className={ui.label}>Mobile number</span>
            <div className="mt-1.5 flex overflow-hidden rounded-xl border border-border-default bg-surface-2 focus-within:border-success focus-within:ring-2 focus-within:ring-success/10">
              <span className="flex items-center border-r border-border-default px-3.5 text-sm text-ink-muted">+91</span>
              <input
                autoFocus
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
                maxLength={10}
                className="h-11 min-w-0 flex-1 bg-transparent px-3.5 text-sm text-ink outline-none placeholder:text-ink-faint"
                required
              />
            </div>
          </label>
          <button type="submit" className={ui.btnPrimary} disabled={submitting} aria-busy={submitting}>
            {submitting ? "Checking & sending…" : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="space-y-4" noValidate>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-ink-faint">OTP sent to</p>
              <p className="mt-0.5 font-mono text-sm text-ink">+91 {phone}</p>
            </div>
            <button type="button" onClick={changeNumber} className="text-xs font-medium text-success hover:underline">
              Change number
            </button>
          </div>
          <label className="block">
            <span className={ui.label}>6-digit OTP</span>
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              maxLength={6}
              className={`${ui.input} mt-1.5 text-center font-mono text-xl tracking-[.35em]`}
              required
            />
          </label>
          <button type="submit" className={ui.btnPrimary} disabled={submitting} aria-busy={submitting}>
            {submitting ? "Verifying…" : "Verify OTP & Sign in"}
          </button>
          <button
            type="button"
            onClick={() => void sendOtp()}
            disabled={submitting || cooldown > 0}
            className="w-full text-center text-xs text-ink-muted transition hover:text-success disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
          </button>
        </form>
      )}

      <div id="otp-recaptcha-container" />
      <div role="status" aria-live="polite" className="space-y-2">
        {notice ? <p className="text-xs text-success">{notice}</p> : null}
        {error ? <p className={ui.errorText}>{error}</p> : null}
      </div>
    </div>
  );
}
