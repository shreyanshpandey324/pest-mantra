"use client";

import { useEffect, useState } from "react";

export function PwaRegistrar() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return offline ? (
    <div className="fixed inset-x-0 top-0 z-[100] bg-warning px-3 py-1.5 text-center text-[11px] font-semibold text-black shadow-lg">
      Offline mode · reconnect to load jobs or send updates. Unsaved report drafts remain on this device.
    </div>
  ) : null;
}
