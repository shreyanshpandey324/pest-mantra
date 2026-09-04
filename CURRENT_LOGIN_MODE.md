# Current Login Mode

## Admin Web

The active Admin Web login is **registered 10-digit mobile number + password**.

- Super Admin: signs in with the phone/password configured by the Super Admin seed environment variables.
- Office Admin: signs in with the phone/password created by a Super Admin.
- Technician accounts are rejected by Admin Web even when backend credentials are valid.
- Login is protected by IP rate limiting and account-level failed-attempt lockout.
- Sessions continue to use the existing access-token + refresh-token flow.

## Password management

- A Super Admin can create an Office Admin and set the initial password in Settings -> Team management.
- A Super Admin can set/reset an existing Office Admin password from the Registered Admin Accounts panel.
- A signed-in Super Admin or Office Admin can change their own password from Settings -> Security.
- Password changes revoke refresh sessions and require a new login.

## Firebase / OTP

Firebase/OTP source code is intentionally retained for the technician app and possible future rollout, but it is **not shown or required for the current Admin Web login**. The uploaded Firebase service-account JSON must never be committed into this project.


## Initial admin accounts

The seed configuration now supports two Super Admin accounts and one Office Admin account.
The configured identities are documented in `INITIAL_LOGIN_ACCOUNTS.md`. Passwords remain environment-only and are never committed to source.
Run `npm run seed:staff` after setting the three temporary passwords in `apps/backend/.env`.
