# Pest Mantra — REAL MODE

This package has **no demo session, no no-login bypass, and no in-memory demo backend**.

## What is required

- Node.js 24 LTS (the exact supported patch is pinned in `.node-version`)
- A real MongoDB connection (MongoDB Atlas recommended)
- Real JWT secrets (generated automatically by `npm run setup:real`)
- Seeded admin accounts
- Firebase only if Technician Phone OTP is required

## Windows — easiest first run

1. Extract the ZIP.
2. Double-click `START_REAL_WINDOWS.bat`.
3. On first run it installs dependencies and opens the one-time real setup.
4. Enter your MongoDB URI and the three admin passwords locally.
5. Run `npm run seed:staff` once.
6. Run `START_REAL_WINDOWS.bat` again (or `npm run real`).
7. Open `http://localhost:3000/login`.

## Admin authentication

Admin Web uses **registered mobile number + password**. There is no demo bypass.

Initial identities configured by the staff seed:

- Shreyansh Pandey — 8076573177 — Super Admin
- Aaryan — 8076532193 — Super Admin
- Ajeet — 9910273207 — Office Admin

Passwords are intentionally **not stored in this source package**. Enter them during `npm run setup:real`.

## Product Tour

The explanatory guided experience is preserved as a **Product Tour** after real authenticated login. It does not bypass authentication or reset production data.

## Technician App

Technician App remains real/authenticated. Existing Phone OTP flow requires Firebase configuration. No OTP bypass is present.


## Hindi / English UI

- Admin Web and Technician App include a persistent **English / हिंदी** language switcher.
- The preference is saved in the browser and does not change database/auth/API behavior.
- See `LANGUAGE_SUPPORT.md` for details.
