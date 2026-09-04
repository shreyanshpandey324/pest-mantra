/** Shared field-friendly visual primitives. */
export const ui = {
  card: "bg-surface border border-border-default rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.035)]",
  btnPrimary:
    "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold bg-accent text-accent-ink shadow-sm hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  btnGhost:
    "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold text-ink-muted bg-surface border border-border-default hover:text-ink hover:border-border-strong transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  btnGhostSm:
    "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-ink-muted bg-surface border border-border-default hover:text-ink hover:border-border-strong transition-colors disabled:opacity-60",
  btnAction:
    "flex w-full items-center justify-center gap-2 h-14 px-5 rounded-2xl text-base font-semibold bg-accent text-accent-ink shadow-sm active:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  btnActionSecondary:
    "flex w-full items-center justify-center gap-2 h-14 px-5 rounded-2xl text-base font-semibold bg-surface text-ink border border-border-strong active:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  input:
    "h-12 w-full px-3.5 rounded-xl border border-border-default bg-surface text-ink text-[15px] placeholder:text-ink-faint focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/10",
  label: "text-[13px] font-semibold text-ink-muted",
  errorText: "text-danger text-[13px] font-medium",
  badge: "text-[11px] font-medium px-2.5 py-1 rounded-full border border-border-default bg-surface-2 text-ink-muted",
} as const;
