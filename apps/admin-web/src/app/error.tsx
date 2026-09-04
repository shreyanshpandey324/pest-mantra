"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas p-6">
      <section className="w-full max-w-lg rounded-3xl border border-border-default bg-surface p-7 text-center shadow-xl">
        <p className="font-mono text-xs uppercase tracking-[.2em] text-danger">Temporary problem</p>
        <h1 className="mt-3 text-2xl font-semibold text-ink">This screen could not be loaded</h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          Check the connection before trying again. If you just submitted a payment or message, open its list first and confirm it was not already saved.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">
            Try again
          </button>
          <a href="/dashboard" className="rounded-xl border border-border-default px-5 py-2.5 text-sm font-semibold text-ink">
            Dashboard
          </a>
        </div>
      </section>
    </main>
  );
}
