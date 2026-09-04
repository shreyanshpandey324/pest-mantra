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
      // Full navigation so every server component / middleware check
      // re-runs against the now-cleared session cookie.
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
      {isLoggingOut ? "Signing out…" : "Sign out"}
    </button>
  );
}
