# Admin Dashboard — Premium Dark Enterprise UI

This document describes the visual redesign of the authenticated Admin Web
dashboard. **No authentication logic, API route, database model, business rule,
env file or secret was changed.** The work is presentation-only.

## Approach: design-system first

The admin frontend already used Tailwind v4 CSS-first tokens
(`--color-surface`, `--color-ink`, `--color-border-default`, `--color-accent`, …)
plus a shared primitive map in `src/lib/ui-classes.ts`. The redesign re-maps
those tokens instead of rewriting 40+ page components, so every dashboard page,
card, table, form, filter bar and modal picks up the new look consistently and
without regression risk.

## Scope of the dark theme

The dark palette is scoped to the class `.pm-shell`, which is applied on the
authenticated dashboard layout (`src/app/dashboard/layout.tsx`).

Surfaces that intentionally stay light:

- Admin login (`/login`)
- Customer portal + customer login
- Public service verification (`/verify/service/[code]`)
- Public feedback page
- Printed service reports (print styles force white)

## Palette

| Token | Value | Use |
| --- | --- | --- |
| `--color-canvas` | `#06080a` | App background (with restrained emerald/blue ambient glow) |
| `--color-surface` | `#101519` | Cards, sidebar, topbar |
| `--color-surface-2` | `#171e23` | Inputs, table headers, filter bars |
| `--color-surface-3` | `#1f272d` | Hover / raised states |
| `--color-border-default` | `#273037` | Hairlines |
| `--color-border-strong` | `#36414a` | Emphasised borders, modals |
| `--color-ink` | `#eef3f1` | Primary text |
| `--color-ink-muted` | `#9aa6a3` | Secondary text |
| `--color-ink-faint` | `#6c7876` | Labels, eyebrow text |
| `--color-accent` | `#2fd98a` | Pest Mantra emerald |
| `--color-success` / `--color-warning` / `--color-danger` | `#35d489` / `#f2c14e` / `#ff6b72` | Status |

## New shell primitives (`globals.css`)

- `.pm-shell` — scoped dark token set, ambient background, dark `color-scheme`,
  themed native controls, `option` colors, placeholders, selection and custom
  scrollbars.
- `.pm-surface-raised` — card surface with a subtle top-light gradient.
- `.pm-topbar` / `.pm-sidebar` — glass topbar and gradient sidebar.
- `.pm-nav-active` — active navigation state (emerald wash + inset rail).
- `.pm-modal-backdrop` — unified glass modal/drawer backdrop, now used by every
  admin modal and drawer.
- `.pm-enter` — restrained page entrance motion (disabled under
  `prefers-reduced-motion`).
- Global table polish inside the shell: uppercase tracked header row on
  `surface-2` and a quiet row hover.

## Expanded primitives (`src/lib/ui-classes.ts`)

`ui` now covers containers (`card`, `cardFlat`, `cardHeader`, `cardBody`,
`panel`), typography (`sectionTitle`, `sectionHint`, `eyebrow`), buttons
(`btnPrimary`, `btnGhost`, `btnGhostSm`, `btnDanger`, `btnSubtle`), forms
(`input`, `select`, `textarea`, `label`, `hint`, `errorText`, `fieldRow`),
filters (`filterBar`, `filterInput`), tables (`tableWrap`, `table`, `th`, `td`,
`tdMuted`, `emptyState`), modals (`modalBackdrop`, `modalCard`, `modalHeader`,
`modalTitle`, `modalBody`, `modalFooter`) and status chips (`badge`,
`badgeSuccess`, `badgeWarning`, `badgeDanger`, `badgeAccent`).

All existing keys were preserved, so no page had to change to keep working.

## Component updates

- **Sidebar** — dark gradient panel, sticky brand header and sticky user footer,
  grouped navigation with token-based active states, truncation for long labels,
  glass mobile backdrop. Navigation data, roles and route logic are unchanged.
- **Topbar** — glass sticky header, tokenised search field with accent focus
  ring, accent avatar. Search action/target unchanged.
- **Dashboard layout** — `.pm-shell` scope, `max-w-[1600px]` content column and
  a responsive padding scale (`p-4 → sm:p-6 → lg:p-8`).
- **Modals & drawers** — all `bg-black/50–70` backdrops replaced with the shared
  `.pm-modal-backdrop` glass treatment.
- **Hardcoded colors removed** from `TechniciansClient`, `TechnicianFilters`,
  `TechnicianProfileDrawer`, `QrCode`, `CustomerPortalAccessCard` and the
  dashboard home quick actions; they now use semantic tokens.

## Verification

```bash
node scripts/verify-source.mjs   # 457 files, 0 syntax errors, 0 missing imports
```

Run the standard `npm ci && npm run verify` locally for the full typecheck and
production build.
