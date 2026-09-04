# AMC Final Fix Pass

This pass fixes the compile blockers and data-integrity issues found in the AMC / Service Contracts module.

## Fixed

- Zod validation now supports refined schemas through the shared validation middleware.
- Update schema no longer calls `.partial()` on a `ZodEffects` object.
- AMC list/detail JSX structure corrected.
- Schedule edits preserve visits that already have linked Projects/history instead of wiping them.
- Included-visit count is validated against the selected contract period/frequency.
- Duplicate renewal is blocked and renewal relationships are stored (`renewedFrom` / `renewedTo`).
- Cancelled contracts cannot be renewed; expired contracts cannot be reactivated.
- Office Admin PATCH requests cannot move a contract to another company/branch.
- Backend build output was regenerated after the fixes.

## Verification actually run

- `npm run typecheck:backend` — PASS
- `npm run typecheck:web` — PASS
- `npm run typecheck:technician` — PASS
- `npm run build:backend` — PASS
- Admin Next.js production build was attempted. The normal script hit an executable permission issue in this sandbox. Running the Next CLI through Node then reached the SWC download step, but the sandbox could not resolve `registry.npmjs.org` (`EAI_AGAIN`). Therefore a production Admin build is **not** claimed as passing here.
