# Expenses & Profit Module

This module extends Pest Mantra's existing Quotation → Project → Invoice/Payment flow with operating-cost control and profitability analytics. It uses real MongoDB Expense records and the existing Invoice/Project data; no dashboard values are mocked.

## Admin Web

Route: `/dashboard/expenses`

Features:
- Current-month finance workspace by default, with custom From/To date filters.
- KPI cards for billed revenue, collections, recognized costs, estimated profit/margin, cash profit and pending approvals.
- Expense categories for fuel, chemicals, technician allowance, travel, equipment, vehicle maintenance, office, utilities, marketing and other costs.
- Project/job linking so expenses contribute to service profitability.
- Optional technician/claimant linking.
- Pending → Approved / Rejected → Paid control flow.
- Secure JPEG/PNG/WEBP receipt upload (8MB maximum) and authenticated receipt viewing.
- Revenue-vs-cost chart, expense-category mix, service profitability and branch profitability.
- Search, status/category filters and CSV export of the current expense view.
- Tenant isolation follows the existing company/branch authorization model.

### Profit definitions

The UI deliberately labels the metrics rather than pretending to provide accounting-grade net profit:
- **Recognized costs** = Approved + Paid expenses whose expense date is in the selected period.
- **Estimated profit** = non-draft/non-void invoice value in the selected period minus recognized costs.
- **Collected revenue** = invoice payments actually recorded in the selected period.
- **Cash profit** = collected revenue minus expenses actually marked Paid in the selected period.

This keeps the dashboard useful while avoiding fake assumptions about payroll, depreciation or taxation that Pest Mantra does not currently model.

## Technician Web App

Route: `/jobs/expenses`

Technicians can:
- Submit their own fuel/travel/field expense claim.
- Link a claim to one of their own visible jobs.
- Upload a receipt image.
- Track Pending Approval / Approved / Rejected / Paid status and admin notes.
- Delete only their own Pending or Rejected claims.

The backend derives the technician identity from the authenticated JWT; a technician cannot submit a claim on behalf of another technician or view another technician's claims.

## Backend

Base route: `/api/v1/expenses`

Admin endpoints:
- `GET /expenses`
- `POST /expenses`
- `GET /expenses/summary`
- `GET /expenses/:id`
- `PATCH /expenses/:id`
- `PATCH /expenses/:id/status`
- `POST /expenses/:id/receipt`
- `GET /expenses/:id/receipt`
- `DELETE /expenses/:id`

Technician claim endpoints:
- `GET /expenses/claims/me`
- `POST /expenses/claims`
- `PATCH /expenses/claims/:id`
- `POST /expenses/claims/:id/receipt`
- `GET /expenses/claims/:id/receipt`
- `DELETE /expenses/claims/:id`

Receipt files use the existing local `uploads/` infrastructure and are always served through authenticated, ownership/scoping-aware routes. As with project photos, production multi-server deployments should move these files to durable object storage.

## Verification performed in the implementation environment

- Backend TypeScript typecheck: passed.
- Admin Web TypeScript typecheck: passed.
- Technician App TypeScript typecheck: passed.
- Backend TypeScript build: passed.
- Admin production build was attempted after making the bundled `next` launcher executable, but Next.js tried to download the Linux SWC package and the environment could not resolve `registry.npmjs.org` (`EAI_AGAIN`). Therefore a production frontend build is **not** claimed as passing.
