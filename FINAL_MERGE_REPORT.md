> **Authentication update:** This report contains an earlier OTP-only merge decision. The current handoff overrides that decision for the Admin Web: Super Admin and Office Admin now use registered mobile number + password. See `CURRENT_LOGIN_MODE.md`.

# Pest Mantra — Unified Premium Merge Report

## Merge base and source reconciliation

The merge uses `pest-mantra-expenses-profit-premium-final(2).zip` as the base because it is the newest cumulative business build. A file-set comparison against the supplied Quotation, Invoice/Payments, AMC-fixed, Feedback, Customer Portal and both Service Reminder scaled ZIPs confirmed that their business source/docs are already present in this base. The only non-auth file missing from the base was `apps/backend/uploads/.gitignore`, which has been restored.

The older Google/password login files were **not** reintroduced because the requested final authentication policy is phone OTP only.

## Preserved cumulative modules

- Dashboard / Companies / Branches
- Projects / Job workflow / status history / photos
- Technicians / Duty / GPS / Tracking / Mileage
- Inventory / Chemical usage
- Complaints & Escalations
- Reports & Analytics
- Settings / Team management / Themes
- Quotation Management
- Invoice & Payments
- AMC / Service Contracts
- Digital Service Reports / Customer Signature / QR verification
- Feedback & Ratings
- Customer Portal Lite
- Service Reminders and scaled pagination/search
- Lead CRM / Sales Pipeline
- Expenses / Approval workflow / Profitability analytics

## Final authentication policy — approved phone OTP only

Interactive staff login is now:

`approved phone → Firebase SMS OTP → Firebase token verification → Pest Mantra whitelist re-check → existing JWT session`

### Backend protections

- New `User.otpLoginEnabled` whitelist flag; default is `false`.
- New staff accounts are blocked from OTP login by default.
- Only Super Admin can change OTP whitelist state.
- Super Admin can view the real staff roster through a new protected `GET /users` endpoint.
- OTP eligibility does not disclose whether a number is missing, inactive or merely blocked.
- OTP eligibility is checked **before** the browser asks Firebase to send SMS.
- The backend re-checks whitelist/active status after OTP verification.
- Firebase token must use `phone` as `sign_in_provider`.
- Verified phone must be an Indian `+91` mobile number.
- Firebase authentication must be recent (maximum 10 minutes).
- Audience is enforced twice: Admin Web accepts Super Admin/Office Admin, Technician App accepts Technician.
- OTP request and OTP verification have separate rate limits.
- The last active OTP-enabled Super Admin cannot be disabled.
- Password and Google interactive login routes are not registered.

### Admin UX

Settings → Team Management now includes **OTP Access Control**:

- real user roster, including Office Admins for Super Admin
- search by name / phone / email / role
- Active / Inactive state
- Approved / Blocked OTP status
- Super-Admin-only toggle
- newly-created accounts clearly show OTP-first policy

The Login screen in Admin Web and Technician App is now a premium two-step OTP flow with:

- +91 phone input
- whitelist check before SMS
- invisible Firebase reCAPTCHA
- 6-digit OTP input
- resend cooldown
- clear Firebase/quota/code errors
- existing JWT access/refresh cookie session after verification

## Bootstrap for an existing database

A new `npm run otp:bootstrap` command uses `OTP_BOOTSTRAP_PHONES` from `apps/backend/.env`.

It:

1. validates every requested number,
2. requires all numbers to already belong to Pest Mantra users,
3. requires at least one active Super Admin in the list,
4. enables OTP only for selected active users,
5. blocks OTP access for every other account.

`npm run seed:superadmin` also enables OTP for the Super Admin accounts it creates/updates so a fresh install is not locked out.

## Firebase configuration

The uploaded Firebase Admin service-account JSON was deliberately **not copied into the merged project or final ZIP**. Real `.env`, `.env.local` and private-key files are also excluded.

Use `docs/FIREBASE_SETUP.md` / `PHONE_OTP_SETUP.md` for setup:

- enable Firebase **Phone** Authentication
- put Web SDK values in both `.env.local` files
- put Firebase Admin project/client/private-key values in backend `.env`
- authorize localhost / production HTTPS domain
- configure the OTP whitelist

## Security / packaging improvements

- Firebase Admin JSON filename patterns are gitignored.
- Backend upload directory `.gitignore` restored.
- No real `.env`, `.env.local`, service-account JSON, node_modules, `.next`, or TypeScript build-cache files are packaged.
- Backend compiled `dist` is rebuilt from the final source.

## Verification actually executed

Successful:

- `npm run typecheck:backend`
- `npm run typecheck:web`
- `npm run typecheck:technician`
- `npm run build:backend`
- compiled backend contains `/auth/otp/eligibility`, `/auth/otp/verify`, and `/:id/otp-access`

Frontend production build attempts were **not** successful in this Linux sandbox because the extracted dependency set did not contain the Linux Next.js SWC binary and the sandbox could not download it from npm (`EAI_AGAIN`). This is an environment/dependency-download limitation, so no frontend production-build pass is claimed.

## Important deployment note

A Firebase service-account private key was supplied during this work. Treat any private key that has been shared outside your local secret store as exposed: generate/rotate a fresh service-account key in Firebase/Google Cloud before production, put only the new value in `apps/backend/.env`, and never package the JSON.
