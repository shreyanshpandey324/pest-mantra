/**
 * Shared visual primitives for the admin frontend.
 *
 * Everything here is expressed with semantic design tokens
 * (surface / ink / border / accent). The authenticated dashboard renders
 * inside `.pm-shell`, which re-maps those tokens to the premium dark
 * enterprise palette, so the same primitives stay correct on the public
 * light surfaces (login, customer portal, printed service reports).
 */
export const ui = {
  /* --- Containers ------------------------------------------------------ */
  card: "pm-surface-raised border border-border-default rounded-2xl shadow-sm",
  cardFlat: "bg-surface-2 border border-border-default rounded-2xl",
  cardHeader:
    "flex flex-wrap items-center justify-between gap-3 border-b border-border-default px-5 py-4",
  cardBody: "p-5",
  panel: "pm-surface-raised border border-border-default rounded-3xl shadow-sm",
  sectionTitle: "text-sm font-semibold text-ink",
  sectionHint: "mt-0.5 text-xs text-ink-faint",
  eyebrow: "text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint",

  /* --- Buttons --------------------------------------------------------- */
  btnPrimary:
    "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold bg-accent text-accent-ink shadow-sm hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  btnGhost:
    "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold text-ink-muted bg-surface-2 border border-border-default hover:text-ink hover:border-border-strong hover:bg-surface-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  btnGhostSm:
    "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-ink-muted bg-surface-2 border border-border-default hover:text-ink hover:border-border-strong transition-colors disabled:opacity-60",
  btnDanger:
    "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold text-danger bg-danger/10 border border-danger/25 hover:bg-danger/15 transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  btnSubtle:
    "inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-hover transition-colors",

  /* --- Forms ----------------------------------------------------------- */
  input:
    "h-11 w-full px-3.5 rounded-xl border border-border-default bg-surface-2 text-ink text-[15px] placeholder:text-ink-faint focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 transition-colors",
  select:
    "h-11 w-full px-3 rounded-xl border border-border-default bg-surface-2 text-ink text-[15px] focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 transition-colors",
  textarea:
    "w-full p-3.5 rounded-xl border border-border-default bg-surface-2 text-ink text-[15px] placeholder:text-ink-faint focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 transition-colors",
  label: "text-[13px] font-semibold text-ink-muted",
  hint: "text-xs text-ink-faint",
  errorText: "text-danger text-[13px] font-medium",
  fieldRow: "flex flex-col gap-1.5",

  /* --- Filters --------------------------------------------------------- */
  filterBar:
    "flex flex-wrap items-end gap-3 rounded-2xl border border-border-default bg-surface-2 p-3 sm:p-4",
  filterInput:
    "h-10 rounded-xl border border-border-default bg-surface px-3 text-sm text-ink placeholder:text-ink-faint focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25",

  /* --- Tables ---------------------------------------------------------- */
  tableWrap:
    "overflow-x-auto rounded-2xl border border-border-default pm-surface-raised shadow-sm",
  table: "w-full min-w-[720px] border-collapse text-sm",
  th: "px-4 py-3 text-left",
  td: "px-4 py-3 text-ink align-middle border-t border-border-default",
  tdMuted: "px-4 py-3 text-ink-muted align-middle border-t border-border-default",
  emptyState:
    "flex flex-col items-center justify-center gap-2 px-6 py-14 text-center text-sm text-ink-muted",

  /* --- Modals ---------------------------------------------------------- */
  modalBackdrop:
    "pm-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4",
  modalCard:
    "pm-surface-raised w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-3xl border border-border-strong shadow-[0_28px_70px_rgba(0,0,0,0.55)]",
  modalHeader:
    "sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border-default bg-surface/95 px-5 py-4 backdrop-blur",
  modalTitle: "text-base font-semibold text-ink",
  modalBody: "px-5 py-5 flex flex-col gap-4",
  modalFooter:
    "flex flex-wrap justify-end gap-2 border-t border-border-default px-5 py-4",

  /* --- Status --------------------------------------------------------- */
  badge:
    "inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border border-border-default bg-surface-2 text-ink-muted",
  badgeSuccess:
    "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-success/30 bg-success/10 text-success",
  badgeWarning:
    "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-warning/30 bg-warning/10 text-warning",
  badgeDanger:
    "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-danger/30 bg-danger/10 text-danger",
  badgeAccent:
    "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent",
} as const;
