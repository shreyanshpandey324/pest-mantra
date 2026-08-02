/**
 * Photo URLs come back from the backend as a path relative to its
 * own origin (e.g. "/uploads/169...-abc.jpg" — see Module 2's
 * photo.controller.ts). This app runs on a different origin/port,
 * so an <img src> using that path as-is would 404 against this
 * app's own server instead. NEXT_PUBLIC_BACKEND_ORIGIN is safe to
 * expose to the browser (just a base URL, not a secret) — this is
 * the one place it's used.
 */
export function toAbsolutePhotoUrl(relativeUrl: string): string {
  const origin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN ?? "http://localhost:4000";
  return `${origin}${relativeUrl}`;
}
