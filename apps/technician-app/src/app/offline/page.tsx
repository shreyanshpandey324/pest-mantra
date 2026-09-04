import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-lg place-items-center p-6 text-center">
      <div>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-border-default bg-surface text-3xl">↯</div>
        <h1 className="mt-5 text-xl font-semibold">You are offline</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">Previously opened job screens can remain available from this device cache. Connect to the internet before submitting status, GPS, photos, expenses or service reports.</p>
        <Link href="/jobs" className="mt-6 inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink">Open cached jobs</Link>
      </div>
    </main>
  );
}
