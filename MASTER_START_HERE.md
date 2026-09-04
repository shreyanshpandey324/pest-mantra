# Pest Mantra — MASTER ALL-IN-ONE FINAL

This is the single consolidated source package to keep going forward.
It contains the latest codebase plus all major UI/UX and workflow upgrades completed so far.

## Keep this build
You can delete older Pest Mantra ZIP versions after confirming this package opens correctly.
This package intentionally excludes local secrets and generated dependencies/build caches.

## Latest consolidated upgrades

### Premium reference-inspired Admin UI
- Bright office-friendly workspace with dark enterprise top header.
- Expandable grouped left sidebar inspired by practical CRM workflows, without copying third-party branding/assets.
- Grouped navigation for Operations, Customers, Sales, Service, Finance/Stock, Communication, Admin/System.
- Cleaner forms, filters, tables, cards, spacing, status chips and responsive behavior.
- Dashboard centered on Quick Actions, Today's work, business health and Fix Now exceptions.

### Premium Admin login
- Split-screen enterprise login layout.
- Centered Pest Mantra brand/logo block.
- Improved visual hierarchy, typography and laptop-height spacing.
- Password show/hide presentation support.
- CSS-only restrained micro-animations: brand/hero fades, staggered feature cards, ambient drift, focus glow and button hover motion.
- Reduced-motion accessibility respected.

### Zero-Chaos Operations
- Admin Exception Inbox for unassigned/overdue jobs, off-duty assignments, failed visits, reschedule requests, stuck work, overdue invoices, SLA breaches and due service reminders.
- Technician one-screen field workflow.
- Next Best Job.
- Smart Handover.
- Failed Visit reasons and office-visible reschedule signal.
- End-of-Day technician summary.
- Existing service completion quality gate, proof photos/signature/chemical usage and next-service automation preserved.

### Assignment alert escalation
Admin can choose three operational assignment levels:
- Normal: one assignment alert.
- Medium: immediate alert + controlled reminders every 15 minutes while unacknowledged, up to the configured limit.
- High: immediate alert + controlled reminders every 5 minutes while unacknowledged, up to the configured limit.

Technician can acknowledge an assignment so escalation stops.
High/Medium unacknowledged assignments surface in the Admin Exception Inbox.
Browser notifications work while the Technician web app is active and permission is granted.
True closed-app push still requires production Firebase Cloud Messaging configuration.

### Technician UX
- Mobile-first bright field UI.
- Next Job / Call / Navigate / Start / service completion workflow.
- Reschedule and Failed Visit actions.
- Larger touch-friendly actions and field cards.
- Priority acknowledgement banner and visible escalation state.

### Existing business modules retained
- Executive Operations / Control Center
- Smart Dispatch
- Customer Master + Customer 360 + multi-site foundation
- CRM Leads
- Quotations
- Projects / Jobs / Calendar / Scheduling
- Technician tracking, GPS and mileage
- Service reports, photos, signature, chemicals and QR verification
- Invoices, partial collections, expenses and profitability
- AMC / recurring services / reminders
- Complaints + SLA
- Inventory
- Feedback
- Notifications / communication outbox
- Audit logs
- Approval Center
- Automation Center
- Export Center
- Saved views / route planning / system health
- Multi-company / branch / SaaS-plan foundations
- Hindi / English UI switching
- Product Tour after authenticated login

## Real-mode architecture
- MongoDB-backed backend.
- Admin uses registered mobile number + password.
- JWT sessions.
- No no-login production bypass.
- Technician phone OTP requires real Firebase configuration.
- Provider-dependent WhatsApp/SMS/email/payment/cloud storage/maps features require their real credentials before production use.

## Local real-mode start
From the extracted project root:

```bat
npm ci
node scripts\setup-real.mjs
npm run seed:staff
node scripts\run-real.mjs
```

Open:
- Admin: http://localhost:3000/login
- Technician: http://localhost:3001/login
- Backend: http://localhost:4000

If ports are occupied, close old Node processes first before starting this build.

## Security
This archive does NOT include:
- `.env` / `.env.local`
- MongoDB credentials
- saved passwords
- Firebase private service-account keys
- node_modules
- `.next`
- compiled backend dist

Configure secrets locally after extraction. Never send or commit production credentials.

## Validation / honesty note
The consolidated source has prior syntax/import validation from the latest upgrade passes. A full production install/build can still depend on local npm/network availability and real provider configuration, so run the normal typecheck/build commands before deployment.

## Deployment-ready handover path

1. Read `DEPLOYMENT_READINESS.md`.
2. Run `npm ci`, `npm run audit:prod`, `npm run verify` and `npm test`.
3. Follow `DEPLOYMENT_RUNBOOK.md` and deploy the included `render.yaml` Blueprint.
4. Complete `CLIENT_UAT_CHECKLIST.md` on the live environment.
5. Finish `FINAL_HANDOVER_CHECKLIST.md` and transfer credentials separately.
