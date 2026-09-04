# Pest Mantra Quotation Module

Integrated into the existing Admin Web + Express/MongoDB backend.

## Workflow
Draft -> Sent -> Accepted / Rejected. Accepted quotations can be converted exactly once into a real Project. Expiry is derived from `validUntil` in the UI/business context; the stored workflow status is preserved for auditability.

## Features
- Tenant-scoped quotation CRUD for Super Admin / Office Admin
- Customer/site/service snapshot
- Itemised pricing with server-authoritative subtotal, discount, tax and total calculation
- Validity, terms, internal notes and service plan metadata
- Premium quotations workspace with KPIs/search/status filtering
- Professional A4-friendly quotation detail / browser Print -> Save PDF
- Valid status transitions enforced on the backend
- Draft-only deletion API
- Accepted quotation -> Project conversion with duplicate-conversion protection and Project history entry
- Admin BFF routes so backend tokens remain server-side

## API
`GET/POST /api/v1/quotations`, `GET/PATCH/DELETE /api/v1/quotations/:id`, `PATCH /api/v1/quotations/:id/status`, `POST /api/v1/quotations/:id/convert`.
