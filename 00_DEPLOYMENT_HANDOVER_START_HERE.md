# Pest Mantra — Deployment & Handover Start Here

Final reliability-audit date: 2026-09-03

## Exact status

This package is **deployment-prepared**, not yet production-accepted. It contains the complete supplied application source plus deployment configuration, environment templates, automated verification, live smoke checks, UAT steps and ownership handover controls.

Do not tell the client that every feature is live until CI, production configuration and UAT have passed.

## Fastest safe release path

1. Push this exact folder to a private company/client-owned Git repository.
2. Run `npm ci`, `npm run audit:prod`, `npm run verify` and `npm test` in CI.
3. Fix any failing typecheck, build or test before continuing.
4. Follow `DEPLOYMENT_RUNBOOK.md` to deploy the included Render Blueprint.
5. Configure MongoDB and the required secrets in the hosting dashboard, never in source files.
6. Run `npm run smoke:live` against the deployed URLs.
7. Complete `CLIENT_UAT_CHECKLIST.md` with the client.
8. Complete `FINAL_HANDOVER_CHECKLIST.md` and obtain written acceptance.

## Read these files

| File | Purpose |
| --- | --- |
| `DEPLOYMENT_READINESS.md` | Verified work, pending gates and honest limitations |
| `FINAL_RELIABILITY_AUDIT_2026-09-03.md` | Final security, reliability and data-integrity audit summary |
| `DEPLOYMENT_RUNBOOK.md` | Step-by-step production deployment |
| `CLIENT_UAT_CHECKLIST.md` | Live feature acceptance test |
| `FINAL_HANDOVER_CHECKLIST.md` | Ownership, credentials, evidence and sign-off |
| `PRODUCTION_INTEGRATIONS.md` | External services still requiring real accounts/keys |
| `THIRD_PARTY_LICENSE_SUMMARY.md` | Locked direct dependencies and license inventory |

## Credentials rule

The ZIP intentionally contains no passwords, `.env` files, database URI or provider private keys. Transfer production credentials separately through the client's approved secure channel.

## Feature-status rule

- **Live**: configured in production and passed UAT.
- **Integration-ready**: code path exists but provider/account configuration is pending.
- **Disabled / not integrated**: do not promise it as live.

Automatic payment gateway reconciliation is not integrated. Current photo/receipt persistence supports one API instance through a persistent disk; migrate to object storage before scaling the API horizontally.
