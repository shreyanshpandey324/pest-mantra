# Pest Mantra Deployment Readiness

Assessment date: 2026-09-03

## Current conclusion

The source has been upgraded for a repeatable three-service deployment and professional UAT/handover. It is **deployment-prepared**, but it is not honestly classified as production-accepted until dependency-backed CI, live configuration and client UAT pass.

## Verified locally

- Both supplied ZIP archives passed compressed-data integrity checks.
- The application source in both archives was byte-identical; the handover archive only added/replaced introductory proof documents.
- Monorepo structure and package manifests are present for Backend, Admin and Technician applications.
- Deployment manifest parses as YAML and declares all three services.
- Sixty-one dependency-free deployment checks pass, including local-import resolution across 463 TypeScript/TSX files and environment-template coverage.
- API contract verification passes across 150 backend routes, 149 Next.js route methods, 234 backend calls, 112 browser API calls, 156 controller references and 108 protected Next.js routes.
- All nine JavaScript/MJS files pass Node syntax checks; JSON manifests/lockfile and the Render YAML parse successfully.
- No real `.env`, private provider JSON, dependency directory or compiled output is included.

## Deployment-readiness changes

- Added `render.yaml` for three services in Singapore.
- Pinned Render and CI to supported Node.js 24.20.0 LTS instead of the EOL Node.js 20 line.
- Added shared JWT access-secret handling and private API discovery.
- Added API, Admin and Technician health checks.
- Added configurable upload storage and automatic directory creation.
- Added a persistent-disk mount for photos and receipts.
- Fixed optional blank environment values that could prevent API startup.
- Updated Technician production start to honor the hosting platform's port.
- Added safe environment templates for every application.
- Added dependency-free deployment verification and live smoke-test scripts.
- Forced installation of build-time devDependencies on all Render services.
- Strengthened CI to use the lockfile, verify, typecheck, build and test.
- Added production dependency auditing and scheduled dependency/update monitoring.
- Added deployment, UAT and final handover checklists.
- Added request timeouts and consistent upstream error handling across both Next.js BFF applications.
- Added file-signature validation, trusted upload extensions and safe receipt/photo path handling.
- Added atomic outbound-message claims and provider idempotency keys to prevent duplicate delivery.
- Changed staff removal to deactivation with session revocation and active-job protection, preserving historical records.
- Protected projects with linked finance, reports, contracts, reminders, quotations, feedback or complaints from hard deletion.
- Prevented authenticated technician pages from entering the service-worker cache and cleared local work state at logout.

## Mandatory gates still pending

1. Run `npm ci`, `npm run audit:prod`, `npm run verify` and `npm test` on a network-connected machine or CI runner.
2. Fix every typecheck, build or test failure before deployment.
3. Configure MongoDB Atlas, HTTPS origins and strong secrets.
4. Deploy all three services and run `npm run smoke:live`.
5. Seed/verify staff accounts without publishing passwords.
6. Complete client UAT and record integration status.
7. Obtain written acceptance before calling the release complete.

## External dependencies

| Area | Current code status | Production requirement |
| --- | --- | --- |
| Core database | Implemented | MongoDB Atlas URI, network rules and backups |
| Admin authentication | Implemented | Seeded users and securely transferred passwords |
| Technician OTP | Integration-ready | Firebase client/Admin credentials and authorized domain |
| Photos and receipts | Implemented for one API instance | Included persistent disk; object storage before scaling |
| Notifications/outbox | Implemented internally | Provider webhook for external delivery |
| Maps | Integration-ready | Restricted Google Maps key |
| Manual collections | Implemented | UAT with test invoices |
| Automatic online payments | Not integrated | Gateway adapter, merchant keys and verified webhook |

## Verification limitation

The source archive intentionally excludes `node_modules`. This workspace cannot fetch the npm dependency tree, so a full TypeScript/build/test result is not claimed in this report. The included CI workflow is the authoritative next gate once the repository is connected.
