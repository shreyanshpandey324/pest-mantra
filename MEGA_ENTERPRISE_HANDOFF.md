# Pest Mantra — Mega Enterprise Handoff

This is the latest consolidated master source for the Pest Mantra Field Service Management platform.

## Included commercial-grade layers

- Authenticated Product Tour and Windows real-mode launcher
- Admin Control Dashboard and Operations Control Center
- Smart project filters, schedule lens, priority and calendar views
- Smart Dispatch scoring with workload, skills, duty/branch fit and geo/ETA support when coordinates exist
- Customer 360 plus Customer Master and multi-site customer records
- Customer Health / lifetime value / outstanding / AMC intelligence
- Quotations, invoices, partial payments, AMC, reminders, complaints/SLA, expenses, inventory and reports
- GPS-backed Proof of Service with photos, chemicals, signature and verification flow
- Technician PWA/offline-friendly shell, draft protection and field workflow
- Approval Center
- Automation Rules Center
- Provider-ready communication outbox for WhatsApp/SMS/email (no fake delivery when provider is absent)
- SaaS/company subscription and international settings foundation
- Export Center and saved project views
- System Health / readiness views
- Audit logs, notification center and recent activity
- Guided Demo Tour, Project Overview and Reset Demo Data

## Demo run (Windows)

1. Run `npm ci` once after extracting.
2. Double-click `START_REAL_WINDOWS.bat`, or run `npm run real`.
3. Admin: http://localhost:3000
4. Technician: http://localhost:3001
5. Backend: http://localhost:4000

Real Mode requires MongoDB and authenticated Admin login.

## Production verification

Run:

```bash
npm ci
npm run verify:commercial
```

For a full production build also run:

```bash
npm run verify
```

## External integrations still require real credentials/accounts

The source contains provider-ready foundations, but live operation requires configuration for services such as:

- MongoDB production database
- WhatsApp/SMS/email provider
- Razorpay/Stripe or another live payment processor
- S3/R2/Cloudinary-style object storage
- Maps/traffic provider for live road ETA/route optimization
- Production domains, HTTPS, backups and monitoring

The application should not claim successful external delivery/payment/storage when those providers are not configured.
