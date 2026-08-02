# Module 4 — Inventory & Chemical Usage
## Audit Report

**Scope:** Backend (Express/MongoDB) + frontend (Next.js admin dashboard) — a new, additive module. Modules 1-3 were not modified beyond two single-line route registrations and one Sidebar navigation entry.

**Standing limitation, unchanged from every prior report:** this sandbox has no network access, so `npm install` / `tsc --noEmit` / `next build` could not actually be run. Every finding below is from manual review, following the same methodology as Modules 1-3 (line-by-line reading, script-assisted unused-import sweeps, manual circular-import tracing). **Run `npm run typecheck:backend` and `npm run typecheck:web` on your machine before treating this as done.**

---

## 1. Why this module

Confirmed from two independent sources rather than assumed: the original architecture document (Section 3, Database Schema) specified `chemicals_equipment` and `technician_checkout_log` tables that were never built in Modules 1-3, and the user's own separately-built tracking document explicitly stated "Ready for Module 4 — Inventory & Chemical Usage." Both point to the same scope.

## 2. Features Implemented

- **Master inventory** — chemicals with a unit (litre/kg/piece/ml/gram), current stock, and a per-item low-stock alert threshold.
- **Checkout** — an admin issues a quantity of a chemical to an on-duty technician. Stock is decremented atomically with a guard (`currentStock >= quantityIssued`), so two concurrent checkouts cannot both succeed past a stale stock read and take the office negative.
- **Return** — records unused quantity returned to the office and credits it back to stock. The checkout record itself is only updatable once (`returnedAt` unset is the guard) — a second return attempt on the same checkout is rejected as a conflict, not silently double-applied.
- **Per-project usage logging** — a technician (or admin) logs how much of a chemical was actually used on a specific job. Goes through the exact same `projectService.getProjectById()` visibility check every other project-scoped operation in the codebase uses — a technician cannot log usage against a project that isn't theirs, for the same reason they can't read or update one.
- **Admin Inventory page** (`/dashboard/inventory`) — stock-level table with a low-stock indicator per row, an open-checkouts table with an inline return control, and two actions ("Add Chemical", "Issue to Technician").

## 3. Files Added

**Backend**
```
src/models/Chemical.ts
src/models/ChemicalCheckout.ts
src/models/ProjectChemicalUsage.ts
src/validators/chemical.validators.ts
src/services/chemical.service.ts
src/controllers/chemical.controller.ts
src/routes/chemical.routes.ts
```

**Frontend**
```
src/types/inventory.ts
src/app/api/chemicals/route.ts
src/app/api/chemicals/[id]/restock/route.ts
src/app/api/chemicals/checkout/route.ts
src/app/api/chemicals/checkout/open/route.ts
src/app/api/chemicals/checkout/[id]/return/route.ts
src/app/dashboard/inventory/page.tsx
src/components/InventoryBoard.tsx
src/components/IssueChemicalModal.tsx
src/components/AddChemicalModal.tsx
```

## 4. Files Modified

```
src/routes/index.ts        — one new line: router.use("/chemicals", chemicalRoutes)
src/components/Sidebar.tsx — one new nav entry: "Inventory" → /dashboard/inventory
README.md                  — new Module 4 section
```
No other Module 1-3 file was touched. No existing model, route, or page had its behavior changed.

## 5. API Endpoints

| Method | Path | Role gate | Notes |
|---|---|---|---|
| GET | `/api/v1/chemicals` | any authenticated | `?all=true` includes inactive items |
| POST | `/api/v1/chemicals` | super_admin, office_admin | Create a new inventory item |
| PATCH | `/api/v1/chemicals/:id/restock` | super_admin, office_admin | Atomic stock increment |
| POST | `/api/v1/chemicals/checkout` | super_admin, office_admin | Atomic stock decrement + checkout record |
| PATCH | `/api/v1/chemicals/checkout/:id/return` | super_admin, office_admin | Atomic, one-time-only return |
| GET | `/api/v1/chemicals/checkout/open` | any authenticated | Technician sees only their own (server-derived, not client-supplied) |
| POST | `/api/v1/chemicals/usage` | any authenticated | Technician limited to own assigned project |
| GET | `/api/v1/chemicals/usage/project/:projectId` | any authenticated | Same project-visibility check |

Every route re-checked for: `authenticate` present, correct `requireRole` where the operation should be admin-only, and Zod validation on every body. No gaps found.

## 6. Database Schema Summary

**Chemical** — `name` (unique), `unit`, `currentStock`, `lowStockThreshold`, `isActive`. Index: `{isActive, name}`.

**ChemicalCheckout** — `technicianId`, `chemicalId`, `quantityIssued`, `issuedBy`, `issuedAt`, `returnQuantity?`, `returnedAt?`, `returnedTo?`. An unset `returnedAt` means the checkout is still open. Indexes: `{technicianId, returnedAt}` (the "what does this technician currently have" query), `{chemicalId, issuedAt}`.

**ProjectChemicalUsage** — `projectId`, `chemicalId`, `quantityUsed`, `loggedBy`, `loggedAt`. Indexes: `{projectId}`, `{chemicalId, loggedAt}`.

## 7. Bug Found and Fixed During Review

**TypeScript enum-vs-string-literal comparison** in `chemical.controller.ts` — `listOpenCheckouts` originally compared `scope.role === "technician"` (a plain string literal) against `scope.role`, which is typed as the `UserRole` enum. This is the exact same class of bug documented and fixed in the Module 1 audit report (TS2367 — a string enum member doesn't compare against a disjoint string literal even when the runtime values match). Caught in this review and fixed to `scope.role === UserRole.TECHNICIAN`. Worth naming explicitly: this is the second time this specific mistake has been made across the project, which suggests it's worth a lint rule or a shared helper rather than relying on review alone to catch it a third time.

## 8. Race Conditions — designed against from the start

Rather than build-then-fix (as Modules 1-2 had to), this module applied the lesson directly: every write that depends on a just-read value uses an atomic conditional update, not read-then-write.

- **Checkout:** `Chemical.findOneAndUpdate({_id, currentStock: {$gte: quantity}}, {$inc: ...})` — the stock check and the decrement happen in one atomic database operation.
- **Return:** `ChemicalCheckout.findOneAndUpdate({_id, returnedAt: {$exists: false}}, {$set: ...})` — a checkout can only be returned once, enforced by the same query, not a separate check-then-write.

## 9. Technician Isolation — verification

Usage logging and its read-back both call `projectService.getProjectById(projectId, scope)` before touching `ProjectChemicalUsage` — no new isolation logic was written for this module; it reuses Module 2's `assertProjectVisible()` exactly. This was a deliberate choice over writing a parallel check, since a second implementation of the same rule is a second place it could be gotten wrong or drift out of sync.

## 10. Known Limitations

1. **No automated verification.** Same standing caveat as every prior report — `npm install`/`tsc`/`next build` have never actually been run against this code.
2. **No stock-adjustment audit trail beyond checkout/restock records themselves.** If stock is manually corrected outside these two flows (there's no such endpoint, but worth naming), there'd be no log of why. Not needed for the current scope, flagged for awareness.
3. **`logUsage` does not decrement `Chemical.currentStock` a second time.** By design — the checkout already removed the quantity from office stock when it left with the technician; usage is a consumption record for reporting, not a second inventory movement. If a future report needs "stock physically remaining with a technician," that's `quantityIssued − sum(usage logged)` per technician, not yet built as its own view.
4. **No UI for the usage-logging endpoint yet.** The API exists and is isolation-checked, but no admin or technician-facing form calls it — consistent with Module 2's technician-facing endpoints, which also have API-only support pending a technician-facing app.

## 11. Production Readiness Score

**8 / 10** — consistent with Module 2's final score, for the same reasons: the two properties that matter most (no negative stock under concurrent checkout, technician isolation on usage logs) are handled correctly and atomically from the start, not patched in after the fact. Held at 8 rather than higher for the same standing reasons repeated in every report: no CI-verified compilation, no automated tests, and the one real bug this review did find (the enum comparison) is a repeat of a known mistake pattern worth guarding against structurally, not just by review.
