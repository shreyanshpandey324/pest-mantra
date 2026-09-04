# Service Reminder & Next Visit Notification System

## What it does

When a technician completes a job, the finalized Service Report can contain a recommended `nextServiceDate`. Pest Mantra now turns that date into one persistent, tenant-scoped Service Reminder.

### Admin / Office
- New **Service Reminders** dashboard and sidebar entry.
- Topbar reminder bell with unread count and 60-second refresh.
- Due-state calculation: scheduled, within 7 days, due soon (2 days), due today, overdue.
- Search/filter, unread/due/overdue KPIs.
- Mark one/all reminders read.
- Reschedule a next-service date.
- One-click **Create next job** using the existing Projects system.
- Duplicate follow-up project creation is blocked atomically.
- Existing finalized reports with a next-service date are backfilled idempotently.

### Customer Portal
- Next-service notification appears in the portal hero and a dedicated **Service reminders** tab.
- Customer sees service type, exact next date, urgency and notes.
- Customer can mark the notification as seen.
- Access remains isolated by company, branch and verified customer phone.

## Notification delivery

This implementation provides real database-backed **in-app notifications** for admins and customers. It does not pretend to send SMS, WhatsApp or email. Those external channels require a configured provider/API and can be connected later without changing the reminder data model.

## Data & security
- Real MongoDB persistence; no mock reminder data.
- Super Admin / Office Admin authorization preserved.
- Company and branch isolation preserved.
- Customer read endpoint uses the separate customer-portal session and customer tenant/phone scope.
- Source Service Report is unique, preventing duplicate reminders.

## Verification performed
- Backend TypeScript typecheck: PASS
- Admin Web TypeScript typecheck: PASS
- Technician App TypeScript typecheck: PASS
- Backend build: PASS
- Admin production Next build: attempted, but sandbox lacks the Linux Next.js SWC binary; not claimed as passed.
