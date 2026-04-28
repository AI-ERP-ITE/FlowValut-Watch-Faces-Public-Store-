# Tasks: Paddle Webhook-Gated Delivery

## Clarification (C)
- [x] C001 Lock paid delivery authority to webhook confirmation.
- [x] C002 Keep PayPal/Stripe modular but disabled by config.
- [x] C003 Apply fixed token policy: 24h TTL, 2 max downloads.
- [x] C004 Apply fixed regeneration policy: 7-day window, max 2, ownership check.

## Implementation (T)
- [x] T001 Refactor order model to provider/status schema.
- [x] T002 Add Paddle checkout endpoint and transaction persistence.
- [x] T003 Add Paddle webhook endpoint with signature + idempotency.
- [x] T004 Create token only on `paid_confirmed` webhook transition.
- [x] T005 Add `/order-status` endpoint for frontend polling.
- [x] T006 Add strict `/download` endpoint with payment gate + atomic counter.
- [x] T007 Add `/regenerate-download` endpoint with limits and ownership validation.
- [x] T008 Disable PayPal/Stripe public payment grant endpoints.
- [x] T009 Refactor frontend checkout flow to Paddle + polling + token download.
- [x] T010 Update env defaults to Paddle and security limits.

## Validation (V)
- [x] V001 Functions TypeScript build passes.
- [x] V002 App TypeScript/Vite build passes.
- [x] V003 No backend route returns paid signed URL before webhook-created token.
- [x] V004 Download route blocks unconfirmed payments and enforces TTL/download limits.
- [x] V005 Regeneration rejects out-of-policy requests and allows valid requests.
- [x] V006 Duplicate webhook events are idempotent.
