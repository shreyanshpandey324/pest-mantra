"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-classes";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Report drafts may contain a customer signature. Clear all
      // technician-specific browser state before another user can sign in on
      // the same device. Language preference is intentionally preserved.
      try {
        for (const storage of [window.localStorage, window.sessionStorage]) {
          for (let index = storage.length - 1; index >= 0; index -= 1) {
            const key = storage.key(index);
            if (
              key?.startsWith("pmt_job_draft_") ||
              key?.startsWith("pmt_arrived_") ||
              key?.startsWith("pmt_assignment_alert_")
            ) {
              storage.removeItem(key);
            }
          }
        }
      } catch {
        // Some privacy modes block browser storage; logout must still finish.
      }
      if ("caches" in window) {
        // Clear every CacheStorage entry, not a hardcoded version string.
        // This previously deleted only "pest-mantra-tech-v1", which drifted
        // out of sync with public/sw.js's VERSION ("pest-mantra-tech-v2")
        // and silently stopped clearing anything on logout.
        try {
          const keys = await window.caches.keys();
          await Promise.all(keys.map((key) => window.caches.delete(key)));
        } catch {
          // Ignore — logout must still finish even if cache clearing fails.
        }
      }
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      className={ui.btnGhostSm}
      onClick={handleLogout}
      disabled={isLoggingOut}
      aria-busy={isLoggingOut}
    >
      {isLoggingOut ? "…" : "Sign out"}
    </button>
  );
}
