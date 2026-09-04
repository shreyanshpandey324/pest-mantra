# Pest Mantra FSM — Real Enterprise Build

Pest Mantra is a field-service and business-operations platform for pest-control companies. This package runs in **real authenticated mode** with persistent MongoDB data.

## Quick start

```bash
npm ci
npm run setup:real
npm run seed:staff
npm run real
```

Windows users can double-click `START_REAL_WINDOWS.bat` after extracting the ZIP.

Open:

- Admin Web: `http://localhost:3000/login`
- Technician App: `http://localhost:3001/login`
- Backend API: `http://localhost:4000`

## Authentication

Admin Web uses **registered mobile number + password**. There is no no-login/demo-session bypass in this build.

Initial seeded identities:

- Shreyansh Pandey — Super Admin — 8076573177
- Aaryan — Super Admin — 8076532193
- Ajeet — Office Admin — 9910273207

Passwords are not committed in source. Enter them locally with `npm run setup:real`, then run `npm run seed:staff`.

Technician authentication remains the real Technician App flow. Firebase configuration is required for Phone OTP.

## Core capabilities

- Executive Control / Operations Center
- Smart dispatch and technician scoring
- Customer Master + Customer 360 + multi-site accounts
- CRM leads and quotations
- Projects / jobs / scheduling / calendar
- Technician tracking, mileage and field workflow
- GPS-backed proof of service, photos, signatures and chemicals
- Invoices, collections, expenses and profitability
- AMC / recurring services / reminders
- Complaints, SLA, approvals and audit logs
- Inventory and restock intelligence
- Automation rules and communication outbox
- System health, exports and SaaS/company controls
- Product Tour for authenticated users

## Verification

```bash
npm run verify:commercial
```

For production deployment, configure real MongoDB, HTTPS/domain, provider credentials, cloud storage and payment/communication integrations as documented in `PRODUCTION_INTEGRATIONS.md`.

## Deployment and handover

- Run `npm run verify:deployment` even before dependencies are installed.
- Run `npm run verify && npm test` before every release.
- Use `render.yaml` and follow `DEPLOYMENT_RUNBOOK.md` for the three-service deployment.
- Complete `CLIENT_UAT_CHECKLIST.md` before claiming features are live.
- Complete `FINAL_HANDOVER_CHECKLIST.md` before transferring ownership.
- Read `DEPLOYMENT_READINESS.md` for the verified status and pending release gates.


## Hindi / English UI

- Admin Web and Technician App include a persistent **English / हिंदी** language switcher.
- The preference is saved in the browser and does not change database/auth/API behavior.
- See `LANGUAGE_SUPPORT.md` for details.
