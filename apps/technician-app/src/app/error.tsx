"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas p-5">
      <section className="w-full max-w-md rounded-3xl border border-border-default bg-surface p-6 text-center shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-danger">Temporary problem</p>
        <h1 className="mt-3 text-xl font-semibold text-ink">This screen could not be loaded</h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Your on-device draft remains available. If you just submitted an update, reopen the job and confirm its latest status before retrying.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={reset} className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-ink">
            Try again
          </button>
          <a href="/jobs" className="rounded-xl border border-border-default px-4 py-3 text-sm font-semibold text-ink">
            Jobs
          </a>
        </div>
      </section>
    </main>
  );
}
