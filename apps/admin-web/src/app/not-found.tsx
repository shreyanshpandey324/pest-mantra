import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas p-6 text-center">
      <div>
        <p className="font-mono text-sm text-accent">404</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Page not found</h1>
        <p className="mt-3 text-sm text-ink-muted">The link may be old or the page may have moved.</p>
        <Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-ink">
          Open dashboard
        </Link>
      </div>
    </main>
  );
}
