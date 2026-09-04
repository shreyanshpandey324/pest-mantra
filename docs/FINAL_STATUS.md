# Pest Mantra — Current Master Build Status

This document describes the current master source. Older module audit reports in `docs/` are historical snapshots and may describe features before later upgrades.

## Authentication policy

- **Admin Web:** Super Admin and Office Admin sign in with their **registered 10-digit mobile number + password**.
- Technician accounts are rejected by the Admin Web and use the Technician application.
- Admin password change and Super Admin → Office Admin password reset are included.
- Existing Firebase/OTP code is preserved for the technician/optional future flow, but it is **not used on the Admin Web login page**.
- Google Sign-In is not enabled in the current master login experience.

## Command & operations

- Executive Business Control Dashboard with today jobs, field-team availability, collections/profit, CRM follow-ups, service reminders, complaints and automated alerts.
- Operations Control Center / dispatch board with job assignment, technician workload, overdue attention and scheduling controls.
- Customer 360 search across operational/customer records.
- Projects, technicians, live tracking and mileage reporting.
- Technician job workspace with current/upcoming/overdue/completed views, calling/navigation shortcuts and service workflow.

## Sales, finance & retention

- Leads CRM with activities/follow-ups.
- Quotations with status lifecycle and quotation → Project conversion.
- Invoices with partial/full payment ledger and overdue detection.
- Expenses & profitability reporting.
- AMC / Service Contracts with visits and renewals.
- Service Reminders.
- Inventory / chemical issue, usage and stock controls.

## Service quality & customer experience

- Digital Service Reports with customer signature, evidence photos, chemical usage, print/PDF layout and public verification.
- Customer Feedback & Ratings with dashboard analytics.
- Customer Portal with jobs, quotations, invoices, AMC, reports and service reminders.
- **Customer Portal Support:** customers can raise complaint tickets and track ticket status, SLA target and resolution.

## Complaints & escalation

A dedicated Complaint entity/API now exists. The previous project-derived placeholder has been replaced.

- Complaint number and linked project (optional).
- Customer, subject, category and full description.
- Low / Medium / High / Critical priority.
- SLA target generated from priority.
- Open / In Progress / Waiting Customer / Resolved / Closed / Reopened lifecycle.
- Admin owner assignment.
- Internal activity/comment timeline.
- Resolution notes.
- SLA breach and critical-ticket metrics.
- Customer Portal-created tickets share the same admin complaint desk.

## Audit & accountability

A central mutation audit middleware records successful authenticated Admin API changes automatically.

- Actor, role, method, route, entity, result code, IP/user-agent and duration.
- Request metadata is bounded and sensitive password/token/secret fields are redacted.
- Audit Log workspace is available in Admin Web.
- Company/branch visibility follows existing role scope.

## Notification & scheduler foundation

The backend includes an in-app operational alert engine and recurring background sweep.

It automatically watches for:

- service reminders due/overdue,
- overdue invoice balances,
- AMC renewals within 30 days,
- overdue CRM lead follow-ups,
- complaint SLA breaches.

Alerts are deduplicated, scoped to company/branch, can be marked read and are displayed in the Admin Notification Center. A manual “Run check now” action is included. The background interval is configurable with:

```env
BACKGROUND_JOBS_ENABLED=true
BACKGROUND_JOB_INTERVAL_MINUTES=15
```

This is also the foundation to plug in a real WhatsApp/SMS/email provider later without rewriting the business-rule detection.

## Verification commands

After installing dependencies:

```bash
npm ci
npm run verify:source
npm run verify:types
npm run verify:build
# or all checks together
npm run verify
```

`verify:source` validates TS/TSX syntax and local imports. `verify:types` runs all workspace TypeScript checks. `verify:build` runs all production builds.

## External integrations still requiring real credentials/infrastructure

These cannot be safely made live with fake credentials inside source code:

- MongoDB production URI and backup policy.
- Strong JWT secrets.
- Real SMS/WhatsApp/email delivery provider credentials if external notifications are desired.
- Razorpay/payment-gateway merchant credentials + webhook secret for automatic online payment reconciliation.
- S3/R2/Cloudinary-style object storage credentials for durable multi-instance photo/receipt storage.
- Google Maps API key/domain restrictions.
- Firebase values only if the preserved technician OTP/future Firebase flow is used.
- Production domain, HTTPS, reverse proxy and monitoring/error-reporting configuration.

## Storage note

Photos/receipts currently use authenticated local-disk storage. The upload path is configurable with `UPLOAD_DIR`, is created automatically, and the included Render Blueprint mounts a persistent disk for a single API instance. Use object storage before multi-instance production hosting.
