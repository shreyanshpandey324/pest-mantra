/**
 * Small set of shared class strings for the handful of primitives
 * (buttons, cards, inputs) that repeat across many components.
 * Not a component library — just avoids the same 15-utility string
 * being retyped (and potentially drifting) in every file that has
 * a button or a card.
 */
export const ui = {
  card: "bg-surface border border-border-default rounded-2xl",
  btnPrimary:
    "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg text-sm font-semibold bg-accent text-accent-ink hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  btnGhost:
    "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg text-sm font-semibold text-ink-muted border border-border-default hover:text-ink hover:border-border-strong transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  btnGhostSm:
    "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold text-ink-muted border border-border-default hover:text-ink hover:border-border-strong transition-colors disabled:opacity-60",
  input:
    "h-11 w-full px-3.5 rounded-lg border border-border-default bg-surface-2 text-ink text-[15px] placeholder:text-ink-faint focus-visible:border-accent focus-visible:outline-none",
  label: "text-[13px] font-medium text-ink-muted",
  errorText: "text-danger text-[13px] font-medium",
  badge: "text-[11px] font-mono px-2.5 py-1 rounded-full border border-border-strong text-ink-muted",
} as const;
