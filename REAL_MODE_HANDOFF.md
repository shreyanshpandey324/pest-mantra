# Real Mode Handoff

- MongoDB-backed API only
- Admin mobile + password authentication only
- Real JWT sessions with silent refresh
- No in-memory demo API
- No no-login Admin path
- No demo-session badge/banner
- No demo-data reset endpoint
- Product Tour remains available after authentication
- Background jobs run against the real database
- Audit logs, tenant isolation, approvals, automation rules and advanced intelligence remain enabled

For local setup run `npm run setup:real`, then `npm run seed:staff`, then `npm run real`.


## Hindi / English UI

- Admin Web and Technician App include a persistent **English / हिंदी** language switcher.
- The preference is saved in the browser and does not change database/auth/API behavior.
- See `LANGUAGE_SUPPORT.md` for details.

