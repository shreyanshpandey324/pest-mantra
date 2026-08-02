/**
 * Same idea as admin-web's lib/ui-classes.ts — a small set of
 * shared class strings so buttons/cards/inputs don't get retyped
 * (and drift) across files. Duplicated rather than imported since
 * this is a separate Next.js app, not a shared package.
 *
 * Adds btnAction / btnActionDanger: large, full-width, high-contrast
 * buttons for the primary field actions (Start Journey, Complete
 * Job, etc.) — a technician taps these outdoors, often with one
 * hand, sometimes with gloves on. Admin-web's regular button sizes
 * are too small for that use case.
 */
export const ui = {
  card: "bg-surface border border-border-default rounded-2xl",
  btnPrimary:
    "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg text-sm font-semibold bg-accent text-accent-ink hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  btnGhost:
    "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg text-sm font-semibold text-ink-muted border border-border-default hover:text-ink hover:border-border-strong transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  btnGhostSm:
    "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold text-ink-muted border border-border-default hover:text-ink hover:border-border-strong transition-colors disabled:opacity-60",
  btnAction:
    "flex w-full items-center justify-center gap-2 h-14 px-5 rounded-xl text-base font-semibold bg-accent text-accent-ink active:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  btnActionSecondary:
    "flex w-full items-center justify-center gap-2 h-14 px-5 rounded-xl text-base font-semibold bg-surface-2 text-ink border border-border-strong active:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  input:
    "h-11 w-full px-3.5 rounded-lg border border-border-default bg-surface-2 text-ink text-[15px] placeholder:text-ink-faint focus-visible:border-accent focus-visible:outline-none",
  label: "text-[13px] font-medium text-ink-muted",
  errorText: "text-danger text-[13px] font-medium",
  badge: "text-[11px] font-mono px-2.5 py-1 rounded-full border border-border-strong text-ink-muted",
} as const;
