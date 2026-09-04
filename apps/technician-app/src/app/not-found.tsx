import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas p-5 text-center">
      <div>
        <p className="font-mono text-sm text-accent">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Screen not found</h1>
        <p className="mt-3 text-sm text-ink-muted">Return to your current job list.</p>
        <Link href="/jobs" className="mt-6 inline-flex rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-ink">
          Open jobs
        </Link>
      </div>
    </main>
  );
}
