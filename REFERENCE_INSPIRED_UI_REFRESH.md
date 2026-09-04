# Pest Mantra — Reference-Inspired UI Refresh

This frontend refresh uses the user's supplied CRM screenshots as workflow/layout inspiration only. It does not copy third-party branding, logos, exact colors, assets, or page text.

## Design direction

- Bright, office-friendly admin workspace with a dark enterprise header.
- White expandable left sidebar with grouped modules and nested submenus.
- Pest Mantra green/teal identity instead of the reference product's branding.
- Modern cards, inputs, buttons, tables, spacing, status states and responsive behavior.
- Light theme is now the recommended/default admin appearance; optional dark appearance remains available.

## Admin changes

- Split-screen Pest Mantra login with brand/benefit panel and clean login card.
- Password show/hide control added without changing authentication behavior.
- Sidebar regrouped around practical workflows: Operations, Customers, Sales, Service, Finance & Stock, Communication, Admin & System.
- Dark navy top header with global customer/job search and signed-in user context.
- Dashboard reworked around Quick Actions, Today at a Glance, Today's Field Schedule, Fix Now, Follow-ups & Business Health, operational checks and upcoming services.
- Existing Zero-Chaos Exception Inbox and deterministic Intelligence Command Bar remain intact.
- Technician directory/filter styling aligned with the new bright admin design.
- Existing APIs, permissions, authentication, database logic and route contracts are unchanged.

## Technician changes

- Bright mobile-first field UI with a strong Pest Mantra header.
- Technician login redesigned without changing OTP/auth logic.
- Sticky field header and simple bottom navigation for Jobs and Expenses.
- Existing Next Best Job, Call, Navigate, route suggestions, field exceptions, completion gates and end-of-day summaries remain intact.
- Larger field-friendly cards/inputs/actions maintained for one-handed use.

## Validation

- Source verification: 453 TS/TSX files checked.
- Syntax errors: 0.
- Missing local imports: 0.
- A full dependency-based Next.js build/typecheck was not completed in this environment because dependency installation timed out.
