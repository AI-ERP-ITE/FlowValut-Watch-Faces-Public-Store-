# Feature Specification: Paddle Webhook-Gated Delivery

**Feature Branch**: `[049-paddle-webhook-gated-delivery]`  
**Created**: 2026-04-27  
**Status**: In Progress

## Objective
Refactor payment and delivery to Paddle as primary provider with strict webhook-gated access and controlled tokenized downloads.

## Non-Negotiable Enforcement
1. Webhook is the only payment authority.
2. No endpoint returns signed download URL before `paid_confirmed`.
3. `NO webhook -> NO token -> NO download`.

## Provider Strategy
- Active provider: `paddle`
- Legacy providers retained but disabled by config:
  - `paypal`
  - `stripe`
- No public delivery path exposed for disabled providers.

## Required Payment Status Enum
- `created`
- `pending_payment`
- `paid_confirmed`
- `failed`
- `refunded`

## Order Model
```json
{
  "orderId": "string",
  "productId": "string",
  "paymentProvider": "paddle|paypal|stripe",
  "paymentStatus": "created|pending_payment|paid_confirmed|failed|refunded",
  "paddleTransactionId": "string|null",
  "paypalOrderId": "string|null",
  "stripeSessionId": "string|null",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "customerEmail": "string|null",
  "regenerationKey": "string",
  "regenerationCount": 0,
  "activeToken": "string|null"
}
```

## DownloadToken Model
```json
{
  "token": "string",
  "orderId": "string",
  "expiresAt": "timestamp",
  "maxDownloads": 2,
  "downloadCount": 0,
  "regenerationCount": 0,
  "createdAt": "timestamp"
}
```

## Endpoints
1. `POST /create-paddle-checkout`
- Creates order with `pending_payment`
- Creates Paddle transaction
- Stores `paddleTransactionId`
- Returns `orderId`, `checkoutUrl`, and provider metadata

2. `POST /paddle-webhook`
- Verifies Paddle signature
- Idempotent event handling
- Handles:
  - `transaction.completed` -> `paid_confirmed` and create token
  - `transaction.payment_failed` -> `failed`
  - `transaction.refunded` -> `refunded`

3. `GET /order-status?orderId=...`
- `paid_confirmed` -> returns token
- else pending/failed/refunded payload

4. `GET /download?token=...`
- Validates token existence/TTL/download-limit
- Fetches order and verifies `paid_confirmed`
- Increments download count atomically
- Returns signed URL (TTL 5 minutes)

5. `POST /regenerate-download`
- Ownership validation: `orderId + email` OR `regenerationKey`
- Reject if not `paid_confirmed`
- Reject if order older than 7 days
- Reject if regenerationCount >= 2
- Issues new 24h token with downloadCount reset

## UX Rules
- After checkout, frontend polls `/order-status`
- Only when token available, call `/download?token=...`
- If expired, frontend offers `Restore Download` and calls `/regenerate-download`
