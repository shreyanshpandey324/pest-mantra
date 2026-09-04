# Enterprise Upgrade Handoff

## Added in this upgrade

1. Dedicated Complaints & SLA Desk (backend + Admin UI).
2. Customer Portal complaint creation/tracking.
3. Central automatic Audit Log for authenticated mutations.
4. Notification Center with due/overdue operational alerts.
5. Background alert scheduler.
6. Dashboard complaint + alert metrics/action queue.
7. Source verification script and root `npm run verify` workflow.
8. Admin registered-mobile + password login remains the active Admin Web login method.

## Demo path

1. Sign in to Admin Web with a registered Super Admin / Office Admin mobile number and password.
2. Open **Complaints** → create a ticket or inspect tickets raised from Customer Portal.
3. Change priority/status/owner, add a note and resolution.
4. Open **Notification Center** → select **Run check now** to generate current due/overdue alerts from real database records.
5. Perform any normal admin change (assign a project, update invoice, etc.) → open **Audit Log** to see the captured mutation.
6. Open Customer Portal → **Support** → submit a complaint → refresh Admin Complaints desk.

## Before production deployment

Run:

```bash
npm ci
npm run verify
```

Then configure production environment values from each `.env.example` and use real infrastructure/credentials. Do not commit service-account JSON files, `.env` files or private keys.
