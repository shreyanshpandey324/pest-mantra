# Module 2 — Final Production Review & Audit Report
## Project Intake, Technician Assignment, Status Tracking, Photo Upload

**Review type:** Full production-readiness pass — bug fixes and code-quality improvements only, no new features added, per explicit instruction.

**Standing limitation, stated again:** this sandbox has no network access, so `npm install` / `tsc --noEmit` / `next build` could not actually run. Every finding below is from manual, line-by-line review across three passes (initial build, quality pass, this final review). **Run `npm run typecheck:backend` and `npm run typecheck:web` in CI before merging** — that is the one thing this report cannot substitute for.

---

## 1. Features Implemented

- **Project intake** — office admin logs a booking (customer, phone, address, service type, notes), auto-generated human-readable project code (`PM-2026-000123`), collision-safe (see §7).
- **Technician assignment** — admin assigns an on-duty technician with a date/time slot; blocks assigning to an off-duty or inactive technician, and blocks double-booking the same technician into the same date+slot on another active job.
- **Assignment audit trail** — `assignedBy` + `assignedAt` stored directly on the project (fast read) in addition to the full event in `ProjectStatusHistory` (complete audit log).
- **Status tracking** — enforced state machine (`new -> assigned -> en_route -> in_progress -> completed`, with `cancelled` reachable from any non-terminal state); every transition recorded immutably.
- **Photo upload** — before/after photos, JPEG/PNG/WEBP only, 8MB cap, MVP local-disk storage with a documented production migration path.
- **Technician duty toggle** — start/end duty (API only — no mobile UI yet, by design; see architecture doc).
- **Live board (admin dashboard)** — real project data, grouped by status, with working "New Project" and "Assign" actions.
- **Technician data isolation** — server-enforced at the data-access layer (see §5), not just hidden in the UI.

---

## 2. Files Added

**Backend**
```
src/models/Project.ts
src/models/ProjectStatusHistory.ts
src/models/ProjectPhoto.ts
src/models/DutyLog.ts
src/validators/project.validators.ts
src/services/project.service.ts
src/services/photo.service.ts
src/services/technician.service.ts
src/controllers/project.controller.ts
src/controllers/photo.controller.ts
src/controllers/technician.controller.ts
src/routes/project.routes.ts
src/routes/technician.routes.ts
src/middleware/upload.middleware.ts
src/utils/callerScope.ts
uploads/.gitignore
```

**Frontend (admin-web)**
```
src/types/project.ts
src/lib/require-token.ts
src/app/api/projects/route.ts
src/app/api/projects/[id]/assign/route.ts
src/app/api/technicians/route.ts
src/components/LiveBoard.tsx
src/components/NewProjectModal.tsx
src/components/AssignModal.tsx
```

**Docs**
```
docs/MODULE_2_AUDIT_REPORT.md (this file)
```

## 3. Files Modified

```
src/routes/index.ts                    - registered project & technician routers
src/app.ts                             - static /uploads serving
src/middleware/validate.middleware.ts  - added validateQuery (query-string counterpart to validateBody)
src/middleware/error.middleware.ts     - added MulterError + CastError handling (see 9, 10)
package.json (backend)                 - added multer, @types/multer
apps/admin-web/src/app/dashboard/page.tsx - real data instead of Module 1's placeholder
README.md                              - Module 2 setup section
```

---

## 4. API Endpoints

| Method | Path | Auth | Role gate | Validated body/query |
|---|---|---|---|---|
| POST | /api/v1/projects | required | super_admin, office_admin | createProjectSchema |
| GET | /api/v1/projects?status=&date= | required | any (result scoped per role) | listProjectsQuerySchema |
| GET | /api/v1/projects/:id | required | any (404 if not visible to caller) | - |
| GET | /api/v1/projects/:id/history | required | any (same visibility check) | - |
| PATCH | /api/v1/projects/:id/assign | required | super_admin, office_admin | assignProjectSchema |
| PATCH | /api/v1/projects/:id/status | required | any (technician limited to own project by the service layer) | updateStatusSchema |
| POST | /api/v1/projects/:id/photos | required | any (same visibility check) | multipart file + photoUploadBodySchema |
| GET | /api/v1/projects/:id/photos | required | any (same visibility check) | - |
| GET | /api/v1/technicians | required | super_admin, office_admin | - |
| POST | /api/v1/technicians/duty/start | required | technician | - |
| POST | /api/v1/technicians/duty/end | required | technician | - |

Every route above was individually re-checked in this pass for: `authenticate` present, correct `requireRole` (or deliberately open + service-scoped), and a validation middleware where the route accepts input. No gaps found.

---

## 5. Technician Isolation — verification

Re-traced end to end in this pass:
- `assertProjectVisible()` in `project.service.ts` is the **only** place that decides whether a technician may see a given project — it checks `project.assignedTechnicianId === scope.userId`, derived solely from the verified JWT (`req.user`, set by `authenticate` middleware from the token, never from a request field).
- Every single-record operation (`getProjectById`, `getProjectHistory`, `assignTechnician`'s target lookup, `updateStatus`, `photoService.addPhoto`, `photoService.listPhotos`) funnels through this one function — confirmed by grep, not just by memory of having written it that way.
- `listProjects` builds its Mongo filter from `scope.role`/`scope.userId` before any query-string input is applied — a technician cannot widen their own result set via `?status=` or any other param.
- A technician requesting another technician's project by id gets **404**, not 403 — deliberately, so existence of the id can't be confirmed by response code alone.
- `getCallerScope()` (new shared helper, see 8) is the single source of `{role, userId}` for every controller — there is no code path that trusts a client-supplied technician id for "who am I."

No isolation gaps found in this pass.

---

## 6. Database Schema Summary

**Project**
- `projectCode` (unique), `customerName`, `customerPhone`, `address`, `serviceType`, `status`
- `assignedTechnicianId`, `assignedBy`, `assignedAt` (assignment audit — new this pass)
- `scheduledDate`, `scheduledTimeSlot`, `createdBy`, `paymentMethod`, `notes`, `completedAt`
- Indexes: `{status, scheduledDate}`, `{assignedTechnicianId, status}`, `{assignedTechnicianId, scheduledDate, scheduledTimeSlot}` (double-booking check)

**ProjectStatusHistory** (immutable audit log)
- `projectId`, `fromStatus`, `toStatus`, `changedBy`, `changedAt`, `remarks`
- Index: `{projectId, changedAt}` (compound — serves both the filter and the sort `getProjectHistory` uses)

**ProjectPhoto**
- `projectId`, `uploadedBy`, `photoType` (before/after), `fileUrl`, `uploadedAt`
- Index: `{projectId, photoType}`

**DutyLog**
- `technicianId`, `dutyStartAt`, `dutyEndAt`
- Index: `{technicianId, dutyEndAt}` (fast "who's on duty right now" lookup — `dutyEndAt` unset)

**Index cleanup done this pass:** three models (`ProjectPhoto`, `ProjectStatusHistory`, `DutyLog`) had a redundant single-field index on their lead field *in addition to* a compound index that already covers single-field queries as its prefix. Removed the redundant ones — same query performance, less index-maintenance overhead on every write.

---

## 7. Race Conditions — found and fixed

| # | Where | Issue | Fix |
|---|---|---|---|
| 1 | assignTechnician | Read-then-write: two concurrent assign requests could both pass the status===NEW check before either saved, double-assigning the same project. | Converted the final commit to findOneAndUpdate({_id, status: NEW}, ...) — atomic, and the second concurrent request now gets a clean 409 conflict instead of silently overwriting the first. |
| 2 | updateStatus | Same read-then-write shape for status transitions. | Same fix — findOneAndUpdate with the previous status as part of the query filter. |
| 3 | startDuty / endDuty | Same shape — a double-tap or two open tabs could both pass the duty-status check. | Same atomic-update pattern applied in technician.service.ts. |
| 4 | generateProjectCode | Count-then-format: two near-simultaneous project creations could compute the same code. | The unique index already prevented a silent duplicate; this pass added a retry loop (up to 3 attempts) in createProject so a collision regenerates and succeeds instead of surfacing a confusing "already exists" error to a legitimate concurrent booking. |

All four were check-then-act patterns — the general lesson applied consistently across the module: **any write that depends on a value just read needs either an atomic conditional update or a unique constraint with a retry, not a plain read-then-save.**

---

## 8. Duplicate Code Removed

- `scopeFrom()` was defined identically in `project.controller.ts` and `photo.controller.ts`, and a near-identical inline check in `technician.controller.ts`. Extracted to `utils/callerScope.ts` (`getCallerScope()`), now imported by all three.
- `CallerScope` interface was defined once in `project.service.ts` and implicitly duplicated in intent by the controllers' local scope-building; now defined once in `utils/callerScope.ts` and imported everywhere it's needed (services and controllers alike).
- Three models had redundant overlapping indexes (see 6).
- `Project.ts`'s phone-number regex was a third inline copy of the same pattern already centralized in `utils/constants.ts` for the `User` model and Zod validators — now imports the shared constant.
- Multer error handling was inline in the route file; extracted to `handlePhotoUpload()` in `upload.middleware.ts` so photo-upload error translation exists in exactly one place.

---

## 9. Photo Upload Flow — verified end to end

1. `authenticate` -> caller identity confirmed.
2. `handlePhotoUpload` (multer) -> file type restricted to JPEG/PNG/WEBP, 8MB cap, 1 file; multer errors translated to the same `{success:false, message}` shape as every other error (fixed this pass — previously would have surfaced as a differently-shaped error for size/count limits specifically).
3. `photoController.upload` -> validates `photoType` via `photoUploadBodySchema.safeParse` (before this pass, this was a manual if-check with a try/catch around `.parse()`; simplified to `safeParse` for clearer control flow).
4. `photoService.addPhoto` -> reuses the exact same project-visibility check as every other project-scoped operation (no separate/divergent check for photos).
5. Response follows the standard envelope.

**Known limitation, unchanged from the prior report:** local disk storage. Filenames are random hex (not enumerable), but the `/uploads` static route is not access-controlled the way API routes are, and local disk does not survive a redeploy or work across more than one server instance. Flagged in code comments, README, and here — not fixed in this pass since it requires a real cloud storage account (S3/R2) to actually implement, which is outside what can be done in this environment.

---

## 10. TypeScript & Consistency Checks

- Automated unused-import sweep across all 17 Module 2 backend files and 9 frontend files (script-assisted, not just eyeballed) — **zero unused imports found** as of this pass.
- Manual circular-import trace across the full Module 2 dependency graph (models -> validators -> services -> controllers -> routes, plus the new `utils/callerScope.ts` leaf) — **no cycles**. `callerScope.ts` imports `AuthenticatedRequest` as a type from `auth.middleware.ts`, which does not import back — confirmed one-directional.
- **New bug found and fixed this pass:** `error.middleware.ts` had no handling for Mongoose's `CastError` (thrown when a URL param like `:id` isn't a valid ObjectId — e.g. `GET /projects/not-a-real-id`). Every such request was falling through to the generic 500 handler, which is both wrong (it's a client input error, not a server failure) and inconsistent with how every other validation failure in this app returns 400. Added explicit handling alongside the existing `ValidationError`/duplicate-key/`MulterError` cases.
- Response envelope re-verified across every Module 2 controller: all nine handlers use `sendSuccess`/`ApiError` exclusively — no direct `res.json()`/`res.status()` calls bypassing the standard shape (checked by grep, not assumption).

---

## 11. Known Limitations

1. **Photo storage is local disk (MVP only).** Won't survive redeploys, won't work multi-server, not access-controlled at the file level. Documented in three places (code comment, README, this report). Fix: S3/R2 pre-signed uploads before onboarding real customer photos.
2. **No automated test suite.** All verification in this and prior reports is manual review; no unit/integration tests exist yet for the isolation guarantees or the state machine.
3. **No CI-run TypeScript compilation.** Stated repeatedly because it matters: this environment cannot install dependencies, so `tsc` has never actually run against this code. Treat as unverified until it does.
4. **No reassignment/reschedule flow.** A project can only be assigned once from NEW; changing technician or date after that isn't supported yet (would need an explicit "reassign" endpoint, out of this module's stated scope).
5. **No real-time push updates.** The live board reflects the current admin's own actions; it won't show another admin's concurrent change without a manual refresh (WebSocket layer is a later architecture phase).
6. **Frontend/backend enum duplication.** `ProjectStatus`/`ServiceType` are hand-copied between backend and `admin-web/src/types/project.ts` with matching string values — a manual-sync risk if they diverge later. A shared types package (per the original architecture doc) would remove this; not done here to avoid restructuring the monorepo mid-module.
7. **Modal focus trapping not implemented.** `NewProjectModal`/`AssignModal` close on Escape and have proper ARIA roles, but Tab can still escape to the page behind them. Real accessibility gap for keyboard/screen-reader users, not fixed this pass.

---

## 12. Production Readiness Score

**8 / 10**

**Up from 7/10 in the prior report.** What moved the needle: the two real correctness bugs found in this final pass (unguarded race conditions on assign/status/duty writes, and the missing CastError handling that was silently returning 500s for bad input) are exactly the class of bug that's easy to miss in a first build and genuinely matters in production — finding and fixing both in a dedicated review pass, rather than shipping them, is what a production-readiness review is for.

**What still holds it at 8, not higher:**
- Zero CI-verified compilation or test run (repeated because it's the single biggest unverified claim in this whole report).
- Photo storage is explicitly MVP-only and known not to survive real deployment conditions.
- Two accessibility and one architectural-hygiene item (enum duplication) are documented but not fixed, by design (out of "bug fixes and code quality" scope, or requiring infrastructure not available here).

**Recommendation before Module 3:** run the CI typecheck (this is the one item that would most change this score in either direction), and make an explicit, tracked decision on photo storage timing rather than letting it remain an implicit MVP shortcut.
