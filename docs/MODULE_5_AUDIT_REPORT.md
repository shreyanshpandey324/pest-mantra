# Module 5 — Technician Web App
## Audit Report

**Scope:** A new, separate Next.js application (`apps/technician-app`) — the technician-facing counterpart to admin-web, closing the gap flagged in every prior module's report ("technician-scoped API endpoints exist, no UI consumes them yet"). One small, additive backend endpoint was added; no existing endpoint was modified.

**Standing limitation, unchanged from every prior report:** `npm install` / `tsc --noEmit` / `next build` have not been run in this sandboxed environment. Every finding below is from manual review, following the same methodology as Modules 1-4.

---

## 1. Why a separate app, not a new section of admin-web

The original architecture document specified the technician client as a separate app from the start (there, a React Native app; here, adapted to a web app for the same reasons Module 3 adapted PWA-style web tooling generally — buildable and reviewable in this environment without native mobile tooling). Reasons this held up:

- **Different role, different auth boundary.** admin-web's login route explicitly rejects a technician account (`TECHNICIAN_APP_ROLES` here does the reverse — rejects admin accounts). Two separate BFFs, two separate cookie namespaces (`pm_*` vs `pmt_*`), means a technician's session cookie is never even structurally valid for the admin app's routes, or vice versa — not just a role check inside a shared app, but two different apps that don't share a session at all.
- **Different UX entirely.** admin-web is a desktop dispatcher console; this is a one-handed, outdoors, single-column mobile flow. Trying to serve both from one Tailwind theme and one layout would have compromised one or the other.

## 2. Features Implemented

- **Login** — phone + password, technician-only (an admin account gets an explicit "this app is for technicians" rejection, mirroring admin-web's reverse case).
- **Session persistence** — same silent-refresh-in-middleware pattern as admin-web, so a technician's 15-minute access token doesn't force a re-login every 15 minutes during an 8-hour shift.
- **Duty Start/End** — a large, single toggle button, Rapido-style, with the current status fetched on load.
- **My Jobs** — the technician's own jobs (active and completed, separated), sourced from the same `GET /projects` Module 2 already scopes to the caller's identity.
- **Job Details** — the full field flow: Start Journey → Arrived → before photos → Start Treatment → after photos → payment method → customer confirmation checkbox → Complete Job.
- **Photo capture** — `<input type="file" capture="environment">`, opens the phone's camera directly rather than a generic file picker, uploaded via `multipart/form-data` to the existing Module 2 photo endpoint.

## 3. Files Added

A full second Next.js app under `apps/technician-app/`, structured identically to admin-web (`src/lib`, `src/types`, `src/components`, `src/app`) — full file list is in the repository; the notable pieces:

```
src/middleware.ts                  — protects /jobs/**, technician-role gate, silent refresh
src/lib/session.ts                 — jose-based JWT verify, pmt_* cookie names
src/lib/backend-client.ts          — same BFF fetch helper as admin-web
src/lib/photo-url.ts               — NEW helper not present in admin-web (see §5)
src/app/api/auth/{login,logout,refresh,me}/route.ts
src/app/api/duty/{start,end,status}/route.ts
src/app/api/jobs/route.ts
src/app/api/jobs/[id]/route.ts
src/app/api/jobs/[id]/status/route.ts
src/app/api/jobs/[id]/photos/route.ts   — NOT a thin backendFetch proxy, see §5
src/app/login/page.tsx + components/LoginForm.tsx
src/app/jobs/layout.tsx, page.tsx, [id]/page.tsx
src/components/DutyToggle.tsx, JobDetailClient.tsx, PhotoUploadSection.tsx, LogoutButton.tsx
```

## 4. Files Modified (backend, Modules 1-2)

```
src/services/technician.service.ts    — added getOwnProfile()
src/controllers/technician.controller.ts — added getMyStatus handler
src/routes/technician.routes.ts       — added GET /technicians/duty/status
```
No existing function, route, or model field was changed — these are pure additions. Reasoning below (§6).

## 5. Two Real Engineering Problems Solved During the Build

**(a) Photo upload can't go through the standard BFF helper.** `backend-client.ts`'s `backendFetch()` always `JSON.stringify()`s its body — fine for every other endpoint, but a file upload needs `multipart/form-data`. `jobs/[id]/photos/route.ts` is deliberately not a thin proxy: it reads the incoming request as `FormData`, validates the two fields the backend's multer middleware expects (`photo`, `photoType`), rebuilds a fresh `FormData`, and does a raw `fetch()` to the backend with an `Authorization` header instead of going through `backendFetch()`. Caught and solved before it could become a "why don't photos upload" bug.

**(b) Uploaded photo URLs are backend-relative, not usable as-is.** Module 2's photo controller returns `fileUrl: "/uploads/xxx.jpg"` — relative to the *backend's* origin. Rendered directly in an `<img src>` in this app (a different origin/port), it would resolve against the technician app's own server and 404. Fixed with a small, explicit `NEXT_PUBLIC_BACKEND_ORIGIN` env var and a one-function helper (`toAbsolutePhotoUrl`) rather than silently shipping broken images — found by tracing the actual data flow, not assumed to be fine because the type checked out.

## 6. The One Backend Addition — reasoning

No route existed for a technician to read their own duty status; the only place `currentDutyStatus` was ever returned was the admin-only technician list (`GET /technicians`, gated to `super_admin`/`office_admin`) and the start/end duty responses themselves (only useful *after* an action, not on page load). Without this, the Duty Toggle button would have had no way to show "Start Duty" vs. "End Duty" correctly when the app first opens.

Added `GET /technicians/duty/status`: `requireRole(UserRole.TECHNICIAN)`, derives the id from `getCallerScope(req)` (never a client-supplied id — same rule as everywhere else in the codebase), returns only the caller's own `TechnicianProfile`. This is additive in every sense: new route, new controller method, new service method: nothing else in `technician.routes.ts` changed shape, and the admin-only list endpoint is untouched.

## 7. The "Arrived" Design Decision

Module 2's status state machine (`ALLOWED_STATUS_TRANSITIONS`) only has `en_route → in_progress` as the technician-triggered transition after assignment — there is no `arrived` status in the backend. Rather than extend that enum and its transition table (a Module 2 modification this build deliberately avoided), "Arrived" is local component state in `JobDetailClient` — tapping it reveals the before-photo step and the "Start Treatment" button, but calls no API.

**Trade-off, stated plainly:** if the technician refreshes the page while still `en_route`, this checkpoint resets and they'd see "Mark Arrived" again even if already tapped. No data is lost (the job's real status is unaffected) and no photo already uploaded is lost — only the on-screen checkpoint resets. Judged an acceptable MVP trade-off over modifying Module 2's state machine; flagged here rather than left implicit.

## 8. Technician Isolation — verification

No new isolation logic was written for this app. Every job-related route (`jobs/route.ts`, `jobs/[id]/route.ts`, `jobs/[id]/status/route.ts`, `jobs/[id]/photos/route.ts`) is a proxy to a Module 2 endpoint that already applies `assertProjectVisible()` before returning or writing anything. The new duty-status endpoint derives its subject from the verified JWT via the same `getCallerScope()` every other technician-scoped write already uses. This app could not show or modify another technician's data without a change to Module 2's service layer, which this build did not make.

## 9. Known Limitations

1. **"Arrived" doesn't survive a page refresh** — see §7, deliberate trade-off.
2. **No offline support.** A technician in a signal-dead zone can't queue a status update or photo for later — the architecture document named this as a Phase 2 feature; not built here.
3. **No automated verification** — the standing caveat repeated in every report. Run `npm run typecheck:technician` and `npm run build:technician` for real before treating this as production-ready.
4. **Photo capture UX is a native file/camera picker, not a custom in-app camera view.** Simpler and more reliable across phone models; a custom capture UI (with retake, crop, compression before upload) is a reasonable future improvement but adds real complexity for an MVP.
5. **`NEXT_PUBLIC_BACKEND_ORIGIN` assumes the backend is reachable directly from the technician's phone.** Fine for same-network/local deployment; a production deployment behind a private network would need either a public backend domain or a photo-proxy route instead — noted, not built, since it depends on real infrastructure decisions this environment can't make.

## 10. Production Readiness Score

**7.5 / 10** — matches Module 1's score for a similar reason: this is a first build of a genuinely new surface (not, like Module 4, a close repeat of an already-proven pattern), and two real integration bugs (multipart upload through the wrong helper, relative photo URLs) were caught by tracing data flow end-to-end rather than trusting types alone — exactly the kind of gap a first build tends to have. Held below Module 2/4's 8 by the added, not-yet-run-for-real surface area (a second full Next.js app) and the explicit "Arrived" trade-off, both flagged rather than hidden.
