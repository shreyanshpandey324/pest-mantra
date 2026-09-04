const VERSION = "pest-mantra-tech-v3";
// Never pre-cache /jobs: it is authenticated, technician-specific HTML and
// must not remain visible from CacheStorage after sign-out or reassignment.
const SHELL = ["/offline", "/manifest.webmanifest", "/pest-mantra-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/login")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        // Authenticated HTML is deliberately network-only. The public offline
        // page is the safe fallback and contains no customer/job information.
        .catch(async () => (await caches.match("/offline")) || Response.error())
    );
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
