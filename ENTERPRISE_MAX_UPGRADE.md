# Pest Mantra — Enterprise Max Upgrade


## Operational intelligence
- Smart project views: pending, upcoming, today, in-progress, completed, overdue, cancelled, unassigned, date range and service filters.
- Month service calendar and seven-day schedule lens.
- Job priority: Normal / High / Urgent.
- Optional registered site coordinates for a job.
- Smart Dispatch recommendation using duty status, service skill, branch fit, workload, priority and, when available, technician GPS proximity.
- Approximate road distance/ETA is explicitly an estimate until a live routing provider is configured.
- Real technician performance aggregates: today's jobs/completions, total completions, average feedback rating and duty mileage.

## Customer & proof intelligence
- Customer 360 health score, lifetime value, outstanding balance, AMC/service risk indicators.
- Service reports snapshot before/after photos, chemicals, digital signature and field GPS.
- If a registered site coordinate exists, the report records distance between the latest technician GPS proof and the registered site.
- Public QR verification exposes only non-sensitive authenticity/proximity metadata.

## Commercial SaaS foundation
- Company subscription plan/status fields: Starter, Growth, Pro, Enterprise.
- 14-day trial foundation, billing currency, timezone and plan limits.
- Technician and branch limits are enforced server-side.
- This is a plan/entitlement foundation only; paid subscription billing still requires a real billing provider.

## Communications foundation
- Persistent outbound-message outbox for WhatsApp, SMS and email channels.
- Provider status is honest: messages stay waiting-for-configuration if no live provider is connected.
- Optional secure webhook delivery with retries.
- Multi-instance scheduler is guarded by a MongoDB lease so two application instances do not run the same periodic sweep concurrently.

## Technician field app
- Installable PWA manifest and service worker.
- Offline-friendly cached shell/jobs fallback and offline status indicator.
- This is not full offline write synchronization; photo/form mutation queues still require a future durable sync engine.

## Production hardening
- Request ID middleware (`X-Request-ID`).
- `/health` liveness endpoint and `/ready` database readiness endpoint.
- Backend Node test foundation for route estimates and project workflow rules.
- `npm run verify:commercial` combines source verification, typechecks and backend tests when dependencies are installed.

## External integrations intentionally not faked
The code does not claim live delivery or payments without credentials. Real production integrations still require:
- MongoDB Atlas or another persistent MongoDB deployment.
- WhatsApp/SMS/email provider or secure communication webhook.
- Razorpay/Stripe for payment links, webhooks and subscription billing.
- S3/R2/Cloudinary for durable photos/receipts.
- Google Maps/Mapbox routing for traffic-aware ETA and route optimization.
- Optional LLM provider if a generative AI assistant is wanted beyond the deterministic Intelligence command bar.
