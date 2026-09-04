# Customer Feedback & Ratings Module

## Purpose

This module turns a finalized Pest Mantra service report into a verified customer-experience loop without exposing private customer contact details, digital signatures or treatment evidence.

## Customer flow

1. A technician completes a job and the service report is finalized.
2. The existing public service-report verification page shows a **Rate this service** action.
3. The customer opens `/feedback/<verification-code>`.
4. The page displays only safe service metadata: service type, job/report number, technician, provider and completion date.
5. The customer can submit:
   - 1–5 star rating
   - recommendation yes/no
   - optional service-quality tags
   - optional written feedback
6. Only one response is accepted per finalized service report.

## Admin flow

Admin Web now includes **Feedback & Ratings** in the sidebar. The dashboard provides:

- average rating
- total responses
- recommendation rate
- five-star response count
- 1–2 star attention count
- rating-distribution chart
- recommendation chart
- technician experience score table
- searchable/filterable recent feedback cards

All analytics use real MongoDB feedback records. No demo/mock feedback is generated.

## Security and tenancy

- Public feedback works only for a valid **finalized** Service Report verification code.
- Public endpoints never return customer phone, customer name, signature image, photos or chemical evidence.
- One response per Service Report is enforced by both application logic and a unique MongoDB index.
- Admin feedback listing is protected by JWT/RBAC and existing company/branch tenant isolation.
- Super Admin can view the global scope; Office Admin remains limited to its company + branch.

## Backend API

- `GET /api/v1/feedback/public/:code` — safe public service metadata + submission state
- `POST /api/v1/feedback/public/:code` — submit a verified customer response
- `GET /api/v1/feedback` — Admin dashboard data and analytics

## Verification status for this implementation

Actually executed in the implementation environment:

- Backend TypeScript typecheck: PASS
- Admin Web TypeScript typecheck: PASS
- Technician App TypeScript typecheck: PASS
- Backend TypeScript build: PASS

Admin Next.js production build was attempted. `next build` could not load the Linux SWC binary from the available dependency set in the sandbox, so a successful Admin production build is **not** claimed.
