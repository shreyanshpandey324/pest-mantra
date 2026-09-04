# Pest Mantra Deployment Runbook

This runbook deploys the monorepo as three Node web services with MongoDB Atlas:

- `pest-mantra-api` — Express API
- `pest-mantra-admin` — Next.js Admin and Customer Portal
- `pest-mantra-technician` — Next.js Technician PWA

The included `render.yaml` targets Render's Singapore region and uses an encrypted persistent disk for current local photo/receipt storage.
The repository pins Node.js 24.20.0 LTS in `.node-version`; CI and Render use the same runtime.

## 1. Ownership and prerequisites

Create these under the customer/company's ownership. Give the delivery team temporary collaborator access instead of using a personal owner account.

- Private Git repository
- Render workspace with billing approved by its owner
- MongoDB Atlas project and cluster
- Production domain and DNS access
- Firebase project if Technician Phone OTP must be live
- Optional messaging, maps, payment and object-storage provider accounts

Never put passwords, private keys, MongoDB URIs or `.env` files in Git, ZIPs, email or chat messages.

## 2. Release gate before deployment

From the repository root:

```bash
npm ci --no-audit --no-fund
npm run audit:prod
npm run verify
npm test
```

Do not deploy if any command fails. Keep the successful CI run URL for the handover evidence.

## 3. MongoDB Atlas

1. Create a dedicated Pest Mantra database user with a unique password.
2. Restrict Atlas network access to the hosting service's outbound IP ranges where possible.
3. Copy the connection string directly into Render's secret field as `MONGODB_URI`.
4. Enable an appropriate backup policy before production data is entered.
5. Never reuse an administrator's Atlas login password as the database-user password.

## 4. Render Blueprint deployment

1. Push this exact source to the private Git repository.
2. In Render, choose **New → Blueprint** and connect the repository.
3. Render reads `render.yaml` and shows three paid web services plus one 1 GB persistent disk. The workspace owner must review and approve the displayed cost before deployment.
4. Enter `MONGODB_URI` when prompted.
5. Enter `CORS_ORIGINS` as a comma-separated list of the final Admin and Technician HTTPS origins. Example:

   ```text
   https://admin.example.com,https://technician.example.com
   ```

6. Deploy the Blueprint. The Admin and Technician services discover the API over Render's private network.
7. Confirm these checks are green:

   - API: `/health`
   - API with database: `/ready`
   - Admin: `/api/health`
   - Technician: `/api/health`

The Blueprint uses the smallest paid compute profile as a safe starting point. Increase service sizes only after reviewing real memory and response-time metrics.

## 5. Seed initial staff securely

Temporarily add the required `SEED_*` variables to the API service using Render's secret settings. Use unique temporary passwords of at least eight characters.

Open the API service shell and run:

```bash
npm run seed:staff
```

Verify each account, force password rotation during handover, then remove the `SEED_*_PASSWORD` variables from the service. Do not publish login credentials in the handover ZIP.

## 6. Optional integrations

### Technician Phone OTP

Add Firebase client values to the Technician service:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Add Firebase Admin values to the API service:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

After changing any `NEXT_PUBLIC_*` value, rebuild and redeploy the relevant Next.js service.

### Maps

Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and optionally `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` to the Admin service. Restrict the browser key to the final Admin domain.

### Communication delivery

The application outbox works without external delivery. To enable the generic provider webhook, add these API variables:

- `COMMUNICATION_PROVIDER=webhook`
- `COMMUNICATION_WEBHOOK_URL`
- `COMMUNICATION_WEBHOOK_SECRET`
- `COMMUNICATION_MAX_ATTEMPTS=3`

### Payments

Recorded/manual collections work in the current code. Automatic payment links and reconciliation require a separate gateway adapter, merchant credentials and webhook verification. Do not label automatic payments as live until that work is implemented and tested.

## 7. Upload persistence

The API writes photos and receipts under `UPLOAD_DIR`. `render.yaml` mounts a persistent disk at that exact path, and the API creates the directory automatically.

This disk-backed mode supports one API instance. Before horizontal scaling, migrate uploads to S3/R2-compatible object storage and verify old-file migration and access controls.

## 8. Custom domains

Recommended names:

- `admin.example.com` → Admin
- `technician.example.com` → Technician
- `api.example.com` → API, only if public API access is required

After DNS and TLS are active, update `CORS_ORIGINS`, Firebase authorized domains, map-key restrictions and the smoke-test URLs.

## 9. Live smoke test

Set the three deployed origins in the terminal and run:

```bash
PEST_MANTRA_API_URL=https://api.example.com \
PEST_MANTRA_ADMIN_URL=https://admin.example.com \
PEST_MANTRA_TECHNICIAN_URL=https://technician.example.com \
npm run smoke:live
```

Then complete every item in `CLIENT_UAT_CHECKLIST.md` with test data.

## 10. Rollback and backup

- Keep the last accepted Git commit and deployment identifier.
- Use Render's previous-deploy rollback for application regressions.
- Treat application rollback and database rollback separately.
- Back up MongoDB before destructive data migrations or bulk imports.
- Disk snapshots are not a replacement for an object-storage migration or independent backup policy.

## Release rule

A feature may be marked **Live** only when it has production configuration and a passed UAT result. Otherwise mark it **Integration-ready** or **Not enabled**.
