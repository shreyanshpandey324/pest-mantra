# Pest Mantra — Final Premium Consolidation

Base: `pest-mantra-operations-control-center-premium(1).zip`

This build uses registered mobile number + password for Super Admin / Office Admin dashboard sign-in and consolidates the existing CRM, quotation, invoice/payment, AMC, service-report, feedback, customer portal, reminders, expenses/profit and Operations Control Center modules.

## Added in this pass

### 1. Executive Business Control Dashboard
The admin landing page is now a business command view instead of a basic project counter.

It surfaces:
- today's jobs and active work
- technicians currently on duty
- month-to-date collections, outstanding value, estimated profit and margin
- open leads and due/overdue follow-ups
- due/overdue service reminders
- overdue invoices and outstanding value
- AMC renewals due within 30 days
- low chemical stock
- low customer ratings
- today's dispatch preview
- a consolidated attention queue

The dashboard uses `Promise.allSettled` so one unavailable module does not blank the entire dashboard.

### 2. Customer 360
New route: `/dashboard/customers`

Search by customer name, phone, address or reference and combine existing records across:
- projects
- invoices / collections
- quotations
- AMC contracts
- CRM leads
- service reminders

No duplicate Customer database was introduced. Customer 360 derives a view from the existing source-of-truth modules.

### 3. Global Customer Search
The desktop top bar now contains a Customer 360 search box so customer context is reachable from anywhere in admin.

### 4. Grouped Admin Navigation
The long flat sidebar is reorganized into:
- Command
- Sales
- Operations
- Service
- Finance & stock
- System

### 5. Technician Field Command View
The technician job screen now separates:
- Today
- Needs attention / overdue
- Assigned without schedule
- Upcoming
- Recently completed

Job cards also include direct Open Job, Call and Navigate actions.

## Reliability / deployment fixes

- Removed deprecated frontend TypeScript `baseUrl` configuration and retained the `@/*` alias with relative path mappings.
- Added backend project search support (`projectCode`, customer name, customer phone, address).
- Admin project BFF now forwards the `search` query.
- Projects page can load a server-side customer search passed in the URL.
- Firebase web client no longer initialises with incomplete environment configuration; the login UI can show a configuration error instead of crashing during module import.
- Default local CORS now includes both admin (`:3000`) and technician (`:3001`) apps.
- Technician GPS permission message uses the actual site host instead of hard-coded `localhost:3001`.
- Legacy photo fallback no longer silently points a production deployment at `localhost:4000` when `NEXT_PUBLIC_BACKEND_ORIGIN` is absent.
- Removed stale compiled `apps/backend/dist` and TypeScript build cache from the deliverable so old generated code cannot drift from current source. Run a fresh build for deployment.

## Authentication decision

Firebase/Google admin login is not active in the current dashboard. Super Admin and Office Admin sign in with their registered 10-digit mobile number and password. The existing OTP/Firebase code is retained for the technician flow / future rollout without being shown on the admin login page.

## Security

No real Firebase Admin service-account JSON or private key is included in this ZIP. Keep credentials only in deployment environment variables. If a service-account private key has been shared outside the deployment secret store, rotate/revoke that key in Google Cloud / Firebase before production use.

## Validation performed in this environment

- Parsed all 347 TypeScript / TSX source files with the TypeScript parser: 0 syntax diagnostics.
- Scanned all local `@/` and relative imports: 0 missing local imports.
- Scanned the deliverable for the uploaded Firebase service-account credential identifiers: no real credential copied into source.
- Removed `node_modules`, `.next`, `dist` and TypeScript cache artifacts from the deliverable.

A full `npm ci` / Next.js production build could not be completed in this sandbox because the npm registry repeatedly returned network/DNS timeouts while downloading dependencies. Run the deployment checklist below on a machine with registry access.

## Deployment checklist

```bash
npm ci
npm run typecheck:backend
npm run typecheck:web
npm run typecheck:technician
npm run build:backend
npm run build:web
npm run build:technician
```

Then configure real environment files (never commit them):
- `apps/backend/.env`
- `apps/admin-web/.env.local`
- `apps/technician-app/.env.local`

For local development, backend CORS should allow both:
`http://localhost:3000,http://localhost:3001`
