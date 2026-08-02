# Pest Mantra — Module 1: Authentication & Dashboard Shell

Production-track implementation of Module 1 from the approved architecture:
JWT authentication (admin + technician accounts), MongoDB models, protected
routes, and the admin dashboard shell. Next.js 15 / React 19 / TypeScript on
the frontend, Node.js / Express / TypeScript / MongoDB on the backend.

## Structure

```
apps/backend/     Express API — auth, users, DB models
apps/admin-web/   Next.js admin dashboard — login, protected dashboard shell
```

## Prerequisites

- Node.js 20+
- MongoDB 6+ running as a **replica set** (even a single-node one). This is
  required because `userService.createUser` uses a Mongo transaction to
  create a user and its technician profile atomically — transactions are
  not available on a standalone `mongod`. Easiest local options:
  - MongoDB Atlas free tier (already a replica set), or
  - `mongod --replSet rs0` locally, then `rs.initiate()` once via `mongosh`.

## Setup

```bash
npm install   # installs both workspaces

cp apps/backend/.env.example apps/backend/.env
cp apps/admin-web/.env.example apps/admin-web/.env
```

Edit both `.env` files:
- Generate two **different** long random secrets for `JWT_ACCESS_SECRET`
  and `JWT_REFRESH_SECRET` in `apps/backend/.env` (e.g. `openssl rand -hex 32`).
- Copy the **same** `JWT_ACCESS_SECRET` value into `apps/admin-web/.env` —
  the dashboard's middleware verifies the token's signature independently
  and must share the secret.
- Set `SEED_SUPER_ADMIN_*` values in `apps/backend/.env` for the bootstrap
  account.

## Run

```bash
# Terminal 1
npm run seed:superadmin      # creates the first super admin (once)
npm run dev:backend          # API on http://localhost:4000

# Terminal 2
npm run dev:web              # Dashboard on http://localhost:3000
```

Log in at `http://localhost:3000/login` with the phone number and password
from `SEED_SUPER_ADMIN_PHONE` / `SEED_SUPER_ADMIN_PASSWORD`. **Rotate that
password immediately after first login** — Module 1 does not yet include a
change-password endpoint; add one before real onboarding (tracked for
Module 2).

## Module 2 — Project Intake, Assignment, Status, Photos

Adds:
- `Project`, `ProjectStatusHistory`, `ProjectPhoto`, `DutyLog` models
- Admin: create project, view live board, assign an on-duty technician
- Technician-facing API (no mobile app UI yet — see architecture doc, the
  technician app is a separate React Native project): list own jobs, update
  status through the state machine, upload before/after photos, start/end duty
- Admin dashboard's live board now shows real data instead of the Module 1
  placeholder, with a "New Project" button and per-project "Assign" action

**New setup step:** photo uploads are stored on local disk in
`apps/backend/uploads/` for this MVP (see the comment in
`upload.middleware.ts` for why, and what to change before real production
use). That folder must exist — it's committed with a `.gitignore` placeholder
so a fresh clone has it automatically.

See `docs/MODULE_2_AUDIT_REPORT.md` for the self-review, security notes, and
production readiness score.

## Module 3 — Admin Frontend: Tracking, Mileage, Full Dashboard

Frontend-only module (`apps/admin-web`), migrated to **TailwindCSS v4** (see
`src/app/globals.css` for theme tokens — no `tailwind.config.js` needed, v4
uses CSS-based `@theme`). Adds 6 more dashboard pages to Module 1-2's shell:
Project List, Project Details, Technician List, Technician Tracking, Mileage
Report, plus Complaints/Reports/Settings as explicit "Coming Soon" states.

**Important:** Technician Tracking and Mileage Report are built against
`/location/live` and `/mileage/report` endpoints described in a document
(`MODULE_3_TECHNICIAN_TRACKING.md`) but never verified against real backend
source. If you have a real backend with these routes, check
`src/types/tracking.ts` and `src/app/api/mileage/report/route.ts` /
`src/app/api/tracking/live/route.ts` first if anything doesn't match — see
`docs/MODULE_3_AUDIT_REPORT.md` for full details.

## Module 4 — Inventory & Chemical Usage

Backend-and-frontend module, additive only — no Module 1-3 file was changed
except two single-line route registrations (`routes/index.ts`, one new
router mount) and one Sidebar nav entry. Adds:

- Master chemical inventory (name, unit, current stock, low-stock threshold)
- Checkout/return flow: admin issues stock to an on-duty technician,
  records what's returned at day's end — both operations are atomic
  (`findOneAndUpdate` with a stock/status guard), following the same
  race-condition-safe pattern Module 2's final review established for
  project assignment.
- Per-project chemical usage logging, reusing `projectService.getProjectById`
  for the exact same technician-isolation check every other project-scoped
  operation in the codebase already goes through.
- New `/dashboard/inventory` admin page: stock levels, open checkouts with
  inline return, "Add Chemical" and "Issue to Technician" actions.

See `docs/MODULE_4_AUDIT_REPORT.md` for the full review.

## Module 5 — Technician Web App

A new, separate Next.js app (`apps/technician-app`, runs on port 3001 in dev)
— the technician-facing counterpart to admin-web, filling the gap noted in
every prior module's report ("API-only, no technician UI yet"). Same BFF
auth pattern as admin-web (httpOnly cookies, Edge-compatible JWT
verification via `jose`), but scoped to the `technician` role only, and
mobile-first (large touch targets, camera-capture photo input,
`max-w-lg` single-column layout).

Pages: Login, Duty Start/End, My Jobs, Job Details (Start Journey → Arrived
→ Start Treatment → before/after photos → payment entry → customer
confirmation → Complete Job).

Uses only Module 2's existing project APIs — no new project/job endpoints
were added. One small, additive backend endpoint *was* added
(`GET /technicians/duty/status`), because no existing route let a
technician read their own duty status (the list endpoint is admin-only).
See `docs/MODULE_5_AUDIT_REPORT.md` for the full review, including the
"Arrived" design trade-off (a local UI checkpoint, not a new backend
status — see the report for why).

**New setup step:**
```bash
cp apps/technician-app/.env.example apps/technician-app/.env
# same JWT_ACCESS_SECRET as the other two apps' .env files
npm run dev:technician   # runs on http://localhost:3001
```

## Before deploying to production

1. Run `npm run typecheck:backend` and `npm run typecheck:web` — could not
   be executed in this sandboxed environment (no network access to install
   dependencies); must be run in CI before merge.
2. Confirm MongoDB is a replica set (transactions will throw otherwise).
3. Set `NODE_ENV=production` on the backend — this activates the guard
   that refuses to boot with placeholder JWT secrets.
4. Put both apps behind HTTPS — the `secure` cookie flag is conditional on
   `NODE_ENV=production` and cookies won't be sent over plain HTTP in that
   mode.
5. Before real customer photos are stored, replace local-disk upload
   storage with S3/R2 pre-signed uploads (see `upload.middleware.ts`) —
   local disk does not survive redeploys or scale past one server.
6. See `docs/MODULE_1_AUDIT_REPORT.md` and `docs/MODULE_2_AUDIT_REPORT.md`
   for the full self-review and known follow-ups.
