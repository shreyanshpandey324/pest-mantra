# Pest Mantra Advanced Upgrade

This build upgrades the existing FSM without duplicating the modules that were already strong.

## Added / enhanced

- Smart Project Views: All, Pending, Upcoming, Today, In Progress, Completed, Overdue, Cancelled and Unassigned.
- Date-range and service-type project filtering.
- Dashboard cards deep-link into filtered action queues.
- Smart Dispatch recommendations based on technician duty state, matching skill, branch fit and selected-day workload.
- Customer 360 Health Score, Lifetime Value and service/payment risk indicators.
- Pest Mantra Intelligence command bar for deterministic natural-language business routing without an external AI key.
- GPS-backed Proof of Service snapshot in production service reports when a technician location is available.
- GPS verification status on the public service verification page.
- Collapsible navigation sections to reduce visible menu clutter while preserving every existing workspace.
- Demo service-reminder filters now behave like the production filter experience.
- Guided Demo / Project Overview updated to explain the advanced decision layer.
- Removed the stale `TechniciansClient.backup.tsx` source file.

## Preserved

- Production MongoDB and authentication architecture.
- CRM, quotations, invoices, AMC, complaints, notifications, audit, expenses/profit, inventory, customer portal, tracking and technician workflows.
- Windows demo launcher.

## Deliberately not faked

- No fake external AI API. The command bar uses deterministic business rules so demos remain reliable.
- No fake route distance. Smart Dispatch only scores data the system actually has (availability, skills, branch and workload).
- GPS proof is optional and is only marked verified when a real/latest technician location record exists.
