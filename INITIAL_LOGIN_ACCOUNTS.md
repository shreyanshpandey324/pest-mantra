# Initial Login Accounts

The Admin Web uses **registered mobile number + password** for both Super Admin and Office Admin accounts.
Firebase/Google sign-in is not required for these accounts.

## Staff identities

| Role | Name | Registered mobile | Email |
|---|---|---|---|
| Super Admin | Shreyansh Pandey | 8076573177 | shreyanshpandey@pestmantra.in |
| Super Admin | Aaryan | 8076532193 | itzaaryan7781@gmail.com |
| Office Admin | Ajeet | 9910273207 | Not set yet |

Production seed passwords are supplied through environment variables / deployment Secrets and are intentionally not stored in this source package.

## Seed the production accounts

Copy `apps/backend/.env.example` to `apps/backend/.env`, configure MongoDB/JWT values and the three `SEED_*_PASSWORD` variables, then run:

```bash
npm run seed:staff
```

The command is idempotent: running it again updates these same three accounts by phone number instead of creating duplicates.

## Zero-setup presentation fallback

