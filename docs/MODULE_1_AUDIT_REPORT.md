# Module 1 — Self-Review & Audit Report
## Authentication, Database Models, Protected Routes, Admin Dashboard Shell

**Scope reviewed:** 41 source files across `apps/backend` (Node/Express/TypeScript/MongoDB) and `apps/admin-web` (Next.js 15/React 19/TypeScript).

**Review method:** Manual line-by-line re-read of every file, checked against TypeScript's actual type-resolution rules, the OWASP ASVS-style checklist below, and WCAG 2.1 AA. Every bug listed below was found this way and fixed before this report was written.

**Important limitation, stated plainly:** this sandbox has no network access, so `npm install` cannot run, which means `tsc --noEmit`, `next build`, and `eslint` could not actually be executed here. Every finding below comes from manual review, not a compiler run. **Before this module is considered done, run `npm install && npm run typecheck:backend && npm run typecheck:web` in a real environment (CI) and fix anything that surfaces.** I'm flagging this clearly rather than claiming a clean compile I didn't actually verify.

---

## 1. Bugs found and fixed during self-review

| # | File | Bug | Fix |
|---|---|---|---|
| 1 | `middleware.ts` (admin-web) | **Critical.** Used `jsonwebtoken`, which depends on Node's `crypto` module. Next.js Middleware runs on the Edge runtime by default — this would throw at runtime in production, not just fail silently. | Replaced with `jose`, which uses Web Crypto and is Edge-compatible. Rewrote `verifySessionToken` as async to match `jose`'s API; updated every caller. |
| 2 | `validators/auth.validators.ts` + `services/user.service.ts` | **Real TypeScript bug.** `createUserSchema.role` was `z.enum([...string literals])`, giving `CreateUserInput.role` a plain string-literal type. Comparing that against `UserRole.SUPER_ADMIN` (a TS string enum member) with `===` triggers TS2367 — string enum members are nominally typed and don't compare against plain literals even when the runtime values match. | Changed to `z.nativeEnum(UserRole)` so the inferred type is `UserRole` itself. |
| 3 | `utils/jwt.ts` | `jwt.verify()`'s return type (`JwtPayload \| string`) doesn't overlap enough with our narrower `AccessTokenPayload`/`RefreshTokenPayload` types for a direct `as` cast — TS2352. | Cast through `unknown` first, then validate `tokenType` at runtime before trusting the shape (defense, not just a type-checker workaround). |
| 4 | `controllers/auth.controller.ts` | Two separate `import { X } from "express"` statements (duplicate import). | Merged into one. |
| 5 | `models/RefreshToken.ts` | Dead code: a `refreshTokenSchema.statics.hashToken` was defined but never called anywhere — the actual code path uses a separately exported plain `hashToken()` function. Two implementations of the same hash, one unused. | Removed the unused static; kept the one function that's actually used on both the issue and verify paths. |
| 6 | `models/User.ts`, `validators/auth.validators.ts` | `PHONE_REGEX` (and an email regex) were each defined twice — once for Zod request validation, once for the Mongoose schema validator — with no shared source, so they could silently drift apart. | Extracted to `utils/constants.ts`, imported in both places. (The double-validation itself — request layer + DB layer — is intentional defense in depth and was kept; only the duplicated literal was removed.) |
| 7 | `components/Sidebar.tsx` | Accessibility bug: nav items used `<a href="#">`, including four permanently-disabled ("SOON") items — dead links that are focusable and do nothing, a known screen-reader/keyboard trap pattern. | Active item is now a real `next/link` to `/dashboard`; disabled items render as non-focusable `<span aria-disabled="true">`, removed from tab order entirely. |
| 8 | `middleware.ts` + `app/page.tsx` (admin-web) | **Functional gap, not just style: broken "session persistence."** The access-token cookie is 15 minutes by design. With no refresh wired into the request path, a user would be silently bounced to `/login` every 15 minutes despite holding a valid 7-day refresh token — the explicit "session persistence" requirement wasn't actually met. | Middleware now attempts a silent refresh (calls the BFF's own `/api/auth/refresh`, forwards the `Set-Cookie` headers onto the outgoing response) whenever the access token is missing/expired but a refresh token is present, before deciding to redirect. Also simplified `page.tsx`, which had started duplicating this same session-check logic — it now just hands off to `/dashboard` and lets middleware be the single source of truth. |
| 9 | `config/env.ts` | `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` were unvalidated strings, then force-cast `as SignOptions` when passed to `jwt.sign()`. A malformed value (typo in `.env`) would only fail at the first login attempt, not at boot. | Added a regex constraint (`/^\d+[smhd]$/`) in the env schema so a bad value fails fast at process start, matching what both `jsonwebtoken` and our own `parseExpiryToMs` actually support. |

None of these were "nice to have" — #1 and #8 would have visibly broken the app in normal use (#1 in any Edge-deployed environment, #8 for every user after 15 minutes), and #2/#3 were real compiler errors, not style nits.

---

## 2. Security audit

| Control | Status | Notes |
|---|---|---|
| Password storage | ✅ | bcrypt, cost factor 12, hashing happens in exactly one place (a pre-save hook), never logged or returned (`select: false` + `toJSON` transform strips it even if selected). |
| No public registration endpoint | ✅ | Every account is created by an authenticated `super_admin`/`office_admin` via `POST /api/v1/users`. Verified no other route creates a `User` document. |
| Brute-force protection | ✅ (two independent layers) | IP-based rate limit on `/auth/login` (10/15min) **and** per-account lockout (5 failed attempts → 15 min lock), so a distributed attempt still can't get past a single account's own defense. |
| Generic auth error messages | ✅ | Login never reveals whether the phone number exists or the password was wrong — same message either way. |
| JWT handling | ✅ | Access tokens short-lived (15 min), refresh tokens rotated on every use (old one revoked, `replacedByTokenHash` recorded for audit), refresh tokens stored **hashed** (SHA-256) in the DB — a DB leak alone doesn't yield usable tokens. |
| Token invalidation | ✅ | `tokenVersion` on the user is bumped on forced logout; refresh checks it and rejects stale tokens even if not yet expired. |
| Server-enforced access control | ✅ | `requireRole()` middleware runs after `authenticate`, which derives identity from the verified JWT + a fresh DB lookup — never from a client-supplied field. This is the mechanism the whole "technician can never see another technician's data" requirement depends on; Module 1 lays the foundation correctly even though the technician-scoped project routes themselves are Module 2+. |
| Cookies | ✅ | Refresh/access cookies are `httpOnly`, `sameSite=lax`, `secure` in production. The browser's JS never has access to a raw JWT — the dashboard never returns tokens in a JSON body to the client, only sets cookies via the BFF. |
| CSRF exposure | ⚠️ Partially mitigated | `sameSite=lax` blocks cross-site POST-via-form CSRF for the cookie-based flow. No CSRF token is implemented yet. Low risk for Module 1 (only auth endpoints exist), but **flag for Module 2**: once state-changing dashboard actions exist (assign job, create project), add CSRF tokens or rely on custom-header checks for same-origin verification. |
| Input validation | ✅ | Every write endpoint validates with Zod before touching the DB. |
| Rate limiting (general) | ✅ | Global limiter (300/15min) in addition to the login-specific one. |
| Security headers | ✅ | `helmet` on the API; `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` on the Next.js app. |
| Secrets handling | ✅ | `.env` files gitignored, `.env.example` has placeholders only, production boot refuses to start with a placeholder-looking JWT secret or matching access/refresh secrets. |
| CORS | ✅ | Explicit origin allowlist (`CORS_ORIGINS`), `credentials: true` only for those origins. |
| Error responses | ✅ | Stack traces and internal error messages only included when `NODE_ENV=development`. |
| Dependency vetting | ⚠️ Not run | Could not run `npm audit` (no network in this sandbox). **Run it in CI before deploy.** |
| CSRF on refresh via middleware fetch | ⚠️ Note | The silent-refresh call in `middleware.ts` forwards the incoming `Cookie` header to `/api/auth/refresh` server-to-server — this is same-origin and not attacker-triggerable, but relies on `getSetCookie()` being supported in the deployed Edge runtime. **Verify this specifically against your deployment target** (Vercel Edge vs. self-hosted Node middleware) since Set-Cookie forwarding across an internal fetch is the one piece of this module I could not integration-test.

---

## 3. TypeScript audit

- `strict: true` on both `tsconfig.json`s, plus `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch` — nothing was relaxed to make code "compile easier."
- Every `as` cast in the codebase is commented with *why* it's necessary and, where the cast could hide a real mismatch (JWT payload shapes), the code re-validates the shape at runtime rather than trusting the cast blindly (see bug #3 above).
- Two real compile errors were caught and fixed by manual review (bugs #2 and #3). I can't rule out others without an actual `tsc` run — see the limitation stated at the top of this report.
- No `any` was introduced anywhere except the one unavoidable case (`res.json()` from `fetch`, which returns `Promise<any>` from the DOM lib itself, not from our code) in `LoginForm.tsx`. Minor future improvement: type that response with a shared `ApiEnvelope<T>` shape instead of leaving it implicit.
- `req.user?` on `AuthenticatedRequest` is deliberately optional, not required — this is what makes `AuthenticatedRequest` structurally assignable from a base `Request` under `strictFunctionTypes`, which is why middleware like `authenticate: (req: AuthenticatedRequest, ...) => ...` can be passed anywhere Express expects a plain `RequestHandler` without a compile error. This was a deliberate design choice, not an accident.

---

## 4. Accessibility audit (WCAG 2.1 AA)

| Check | Status |
|---|---|
| Keyboard navigation | ✅ | Every interactive element is a real `<button>`, `<a>`/`Link`, or form control — no `onClick` on non-interactive `<div>`s. Disabled nav items are `<span aria-disabled>`, correctly removed from tab order (see bug #7). |
| Focus visibility | ✅ | Global `:focus-visible` outline defined once in `globals.css`, never suppressed anywhere in the codebase. |
| Form labeling | ✅ | Every input has a real `<label htmlFor>`, not a placeholder-as-label. |
| Error announcement | ✅ | Login error region uses `role="status" aria-live="polite"`; inputs get `aria-invalid` + `aria-describedby` pointing at the error text when present. |
| Color contrast | ✅ (manually estimated) | Primary text `#F2F1ED` on background `#0F1115` is very high contrast. Accent buttons use dark text (`#171A21`) on the orange accent (`#FF7A1A`) rather than white — white-on-orange would fail AA at that saturation; dark-on-orange comfortably passes. Secondary/muted text was chosen for a large luminance gap against the dark surfaces it sits on. **Not machine-verified** (no tool run) — recommend a Lighthouse/axe pass in CI. |
| Reduced motion | ✅ | `prefers-reduced-motion` respected globally. |
| Landmarks | ✅ | `<nav aria-label="Primary">`, `<header>`, `<main>` present in the dashboard shell. |
| Loading/busy states | ✅ | Login and logout buttons set `aria-busy` and disable themselves while in flight, with visible text state changes ("Signing in…"). |

---

## 5. Code duplication audit

- Removed: duplicate `hashToken` implementation (#5), duplicate `PHONE_REGEX`/email regex literals (#6), duplicate `Request` import (#4), duplicate session-check logic between `middleware.ts` and `page.tsx` (#8).
- Intentionally **kept** as non-duplication: the phone-format regex exists in three places (Mongoose validator, Zod schema, and the client-side `LoginForm.tsx`). The first two now share one constant; the third can't easily share code across the frontend/backend boundary without a shared npm package, and duplicating a simple regex for client-side UX validation (with the backend as the actual source of truth) is a normal, accepted pattern rather than a smell.
- `asyncHandler` is the single mechanism used by every controller to avoid repeated `try/catch/next(err)` blocks — no controller reimplements error forwarding.
- `sendSuccess` / `ApiError` give one consistent response envelope and error shape across every endpoint — no controller hand-rolls its own response format.

---

## 6. What Module 1 actually delivers

- MongoDB models: `User` (with role, branch, lockout, token versioning), `TechnicianProfile`, `Branch`, `RefreshToken` (hashed, rotated, revocable).
- JWT auth: login, silent refresh (rotated), logout (revokes server-side), `/auth/me`.
- Admin-only user creation endpoint (technicians and office admins are onboarded by an admin — no public signup).
- Protected routes: Express-side (`authenticate` + `requireRole`) and Next.js-side (Edge middleware + an authoritative second check in the dashboard layout against the live backend).
- Admin dashboard shell: login page, live-board layout with empty states, sidebar/topbar, working logout, session persistence across the 15-minute access-token boundary.
- Account bootstrap via a seed script (no hardcoded credentials in source).

## 7. Known follow-ups before/alongside Module 2 (not blocking, but tracked)

- No change-password endpoint yet — the seeded super admin password must be rotated manually via direct DB access today. Should be one of the first things Module 2 adds.
- CSRF tokens not yet implemented (see security table) — fine while only auth endpoints exist, needed once state-changing admin actions ship.
- `revokeAllSessions()` exists in `auth.service.ts` (for a future "log out of all devices" / admin-forced-logout feature) but isn't wired to a route yet — intentional, not dead code, but worth noting it's unused today.
- Automated tests: none yet. Module 1 was reviewed manually to the depth described above; unit/integration tests (especially for the role-isolation guarantees) should be added before Module 2 builds on top of this.

---

## 8. Production readiness score

**7.5 / 10 — solid, correctly-designed foundation; not yet deploy-ready without the items below.**

**What earns the 7.5:** the hard security decisions are made correctly (hashed+rotated refresh tokens, account lockout, no public signup, server-enforced role checks, no raw JWTs ever reaching browser JS, fail-closed defaults throughout), the Edge-runtime bug and the session-persistence gap were real production-breaking issues that got caught before shipping, and the accessibility/duplication bars are genuinely met, not just asserted.

**What holds it back from 9-10:**
1. **Zero automated verification.** No `tsc` run, no test suite, no `npm audit`, no Lighthouse/axe run — every claim in this report is from careful manual review, not tooling. That gap alone caps the score until CI actually runs green.
2. Mongo transactions require a replica set — an easy deployment footgun if someone points this at a standalone `mongod` and gets a runtime crash on first user creation. Documented in the README, but worth a startup-time check that fails clearly instead of failing on first write.
3. CSRF protection is partial (relies on `sameSite=lax` alone).
4. No password-change/rotation path yet for the bootstrap account.

**Recommendation:** run the CI checks named in the README, add a `POST /auth/change-password` endpoint, and this module is ready to build Module 2 on top of with confidence.
