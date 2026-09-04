# Production Integrations — Remaining External Setup

The application is designed to stay honest when a third-party provider is not configured.

## Required for production persistence
- `MONGODB_URI`
- strong, different `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
- production `CORS_ORIGINS`

## Communication delivery
The built-in outbox works without a provider, but live delivery requires either a vendor adapter or the generic secure webhook:
- `COMMUNICATION_PROVIDER=webhook`
- `COMMUNICATION_WEBHOOK_URL=https://...`
- `COMMUNICATION_WEBHOOK_SECRET=...`
- `COMMUNICATION_MAX_ATTEMPTS=3`

## Technician OTP (only if that production auth mode is used)
- Firebase client configuration in the Technician app
- Firebase Admin credentials on the backend

## Recommended next provider integrations
1. Object storage (Cloudflare R2 / AWS S3 / compatible) for service photos and receipts.
2. Razorpay or Stripe for payment links and webhook reconciliation.
3. Google Maps Routes or Mapbox Directions for live distance, traffic ETA and multi-stop route optimization.
4. Redis/BullMQ if extremely high-volume durable jobs/retries are required beyond the current MongoDB lease-protected scheduler/outbox.

