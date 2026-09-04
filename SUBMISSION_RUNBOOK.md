# Pest Mantra — Submission Runbook

## 1. Install dependencies

```bash
npm ci
```

## 2. Create local environment files

macOS/Linux/Git Bash:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/admin-web/.env.example apps/admin-web/.env.local
cp apps/technician-app/.env.example apps/technician-app/.env.local
```

On Windows Command Prompt, use `copy` instead of `cp`.

## 3. Configure the minimum values

In `apps/backend/.env`:

- set a reachable `MONGODB_URI`
- replace both placeholder JWT secrets with strong values

Copy the exact same `JWT_ACCESS_SECRET` into:

- `apps/admin-web/.env.local`
- `apps/technician-app/.env.local`

For local development, keep:

- Admin/Technician `BACKEND_API_URL=http://localhost:4000/api/v1`
- Technician `NEXT_PUBLIC_BACKEND_ORIGIN=http://localhost:4000`

Firebase values are not needed for Admin Web mobile+password login. They are only needed if the Technician OTP flow is being demonstrated.

## 4. Seed the three initial Admin accounts

```bash
npm run seed:staff
```

Expected accounts:

- Shreyansh Pandey — Super Admin — 8076573177
- Aaryan — Super Admin — 8076532193
- Ajeet — Office Admin — 9910273207

The requested initial passwords are documented in `INITIAL_LOGIN_ACCOUNTS.md` and present in the backend `.env.example`. Change them after the handoff/demo.

## 5. Run verification

```bash
npm run verify
```

If `npm run verify` fails, do not ignore the first error. Fix that error and rerun the command.

## 6. Start the project

Open three terminals:

```bash
npm run dev:backend
```

```bash
npm run dev:web
```

```bash
npm run dev:technician
```

Admin Web should be at `http://localhost:3000` and Backend at `http://localhost:4000`.

## 7. Fast submission smoke test

Before presenting/submitting, verify:

1. Shreyansh can log in using registered mobile + password.
2. Aaryan can log in using registered mobile + password.
3. Ajeet can log in using registered mobile + password.
4. Dashboard loads.
5. Projects list opens and a project can be created/assigned.
6. Operations Control Center loads.
7. Customer 360 search opens.
8. Leads, Quotations, Invoices, AMC, Reminders and Expenses open.
9. Complaints page loads and a ticket can be created.
10. Audit Logs and Notification Center load.
11. Customer Portal opens for an enabled customer access record.
12. If Technician OTP/Firebase is configured, Technician App login and job workflow are tested.

## Not bundled as live external services

The source contains foundations/workflows, but these require your own real provider/infrastructure credentials:

- WhatsApp/SMS/email delivery provider
- Razorpay/UPI online payment gateway
- S3/R2/Cloudinary object storage
- production MongoDB/backups
- production domain/HTTPS
- Google Maps production key/domain restrictions
