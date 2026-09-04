"use client";

export function PrintServiceReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-accent-ink transition hover:bg-accent-hover print:hidden"
    >
      Print / Save PDF
    </button>
  );
}
