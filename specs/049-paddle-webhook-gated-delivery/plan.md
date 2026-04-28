# Plan: Paddle Webhook-Gated Delivery

## Clarification Steps (4)
1. Clarification 1: Payment authority locked to webhook only for paid access.
2. Clarification 2: Keep PayPal/Stripe code in disabled modular state, not deleted.
3. Clarification 3: Token policy fixed to 24h TTL and max 2 downloads.
4. Clarification 4: Regeneration self-service allowed within 7 days and max 2 regenerations with ownership validation.

## Implementation Steps
1. Refactor backend payment model to strict provider/status schema.
2. Add Paddle checkout creation endpoint and provider adapter abstraction.
3. Add Paddle webhook endpoint with signature verification + idempotency.
4. Implement webhook-only token issuance (`downloadTokens` collection).
5. Implement strict download endpoint with atomic counters and signed URL generation.
6. Implement order status endpoint for polling.
7. Implement regeneration endpoint with ownership and limits.
8. Disable PayPal capture/webhook access via config-gated responses.
9. Refactor frontend flow to Paddle checkout + status polling + token download + restore download.
10. Update env templates and runtime config defaults.

## Validation Steps (4)
1. Validation 1: Build validation (`functions` + `app`) passes.
2. Validation 2: Static check confirms no paid download URL returned before webhook-confirmed token.
3. Validation 3: Runtime path check confirms `/download` enforces `paid_confirmed`, TTL, and maxDownloads.
4. Validation 4: Regeneration logic confirms ownership + time-window + regeneration limit.
