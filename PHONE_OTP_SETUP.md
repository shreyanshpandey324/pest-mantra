# Firebase Phone OTP Setup

Pest Mantra now uses **phone-number + OTP only** for interactive staff login.
Google sign-in and the phone+password login routes are not registered.

The login policy has two independent security checks:

1. Firebase Phone Authentication must successfully verify the SMS OTP.
2. The verified phone number must belong to an active Pest Mantra `User` whose
   `otpLoginEnabled` flag is enabled by a Super Admin.

A verified Firebase phone number by itself never creates a Pest Mantra account,
never assigns a role, and never grants company/branch access.

## 1. Enable Phone Authentication

Firebase Console → Authentication → Sign-in method → **Phone** → Enable.

Review Firebase SMS region / quota settings for the countries you intend to
support. The application currently accepts Indian mobile numbers and sends them
to Firebase in `+91XXXXXXXXXX` format.

## 2. Register / configure the Web App

Firebase Console → Project Settings → General → Your apps → Web app → SDK setup
and configuration → Config.

Copy the Web SDK values into **both** files:

- `apps/admin-web/.env.local`
- `apps/technician-app/.env.local`

```env
NEXT_PUBLIC_FIREBASE_API_KEY=<apiKey>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<authDomain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<projectId>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<storageBucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<messagingSenderId>
NEXT_PUBLIC_FIREBASE_APP_ID=<appId>
```

These browser SDK values identify the Firebase project; they are not the
Firebase Admin private key.

## 3. Configure Firebase Admin on the backend

Firebase Console → Project Settings → Service Accounts → Generate new private
key. Keep the downloaded JSON private.

Copy only the three required values into `apps/backend/.env`:

```env
FIREBASE_PROJECT_ID=<project_id>
FIREBASE_CLIENT_EMAIL=<client_email>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Keep the literal `\n` sequences in the private key. Never commit the service
account JSON or the real `.env` file.

## 4. Authorized domains

Firebase Console → Authentication → Settings → Authorized domains.

Keep `localhost` for local development and add your real HTTPS domain before
deployment.

## 5. Choose exactly which phone numbers may log in

There are two supported controls.

### Admin UI

Super Admin → Settings → Team Management → **OTP Access Control**.

Every account shows `Approved` or `Blocked`. New staff accounts start blocked.
Only Super Admin can change the OTP whitelist.

### One-time bootstrap for an existing database

Set a comma-separated list of existing users in `apps/backend/.env`:

```env
OTP_BOOTSTRAP_PHONES=9876543210,9123456789
```

The list must include at least one active Super Admin. Then run from the repo
root:

```bash
npm run otp:bootstrap
```

The script enables only the listed active users and blocks OTP login for every
other account. It refuses to proceed if a listed phone is not an existing user
or if no active Super Admin is included.

`npm run seed:superadmin` also enables OTP access for the Super Admin accounts it
creates/updates so a fresh installation can be bootstrapped safely.

## 6. Login flow

1. User enters a 10-digit phone number.
2. App asks the backend whether that number is active, role-appropriate, and
   explicitly OTP-approved.
3. Only after approval does the browser ask Firebase to send the SMS OTP.
4. Firebase verifies the OTP and issues an ID token.
5. Backend verifies that token with `firebase-admin`, requires `phone` as the
   Firebase sign-in provider, extracts the trusted `+91` phone number, and
   requires the authentication to be recent.
6. Backend checks the whitelist again and issues the normal Pest Mantra JWT
   access/refresh token pair.
7. Admin Web accepts only Super Admin / Office Admin sessions; Technician App
   accepts only Technician sessions.

## 7. Relevant routes

Backend:

- `POST /api/v1/auth/otp/eligibility`
- `POST /api/v1/auth/otp/verify`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Admin/Technician BFFs expose matching `/api/auth/otp/...` routes and store JWTs
in their existing httpOnly session cookies.

## 8. Security notes

- Password and Google interactive login routes are intentionally not registered.
- OTP sending is rate-limited separately from OTP verification.
- The public eligibility response is deliberately generic; it does not reveal
  whether a number is missing, inactive, or simply blocked.
- A Super Admin cannot disable OTP for the last active OTP-enabled Super Admin.
- Firebase ID tokens are accepted for OTP login only when the Firebase
  `sign_in_provider` is `phone`.
- Real `.env`, `.env.local`, and Firebase Admin JSON files must stay out of ZIPs,
  Git repositories, screenshots, and chat messages.
