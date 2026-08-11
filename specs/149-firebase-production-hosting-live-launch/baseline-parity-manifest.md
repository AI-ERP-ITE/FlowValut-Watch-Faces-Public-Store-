# Spec 149 — Baseline Clone and Parity Manifest

**Updated:** 2026-08-10  
**Source baseline:** `zeppfaceloader-b0b106e9`  
**Isolated staging:** `flowvault-staging-2026`

## Current result

The data clone and expected staging runtime deployment parity are complete. The successful Sandbox commerce path has passed; declined-payment, QR-on-device, recovery, and remaining security/performance acceptance cases are still required.

## Data and platform evidence

- Firestore clone: 587 documents across every discovered root and nested collection.
- Storage clone: 1,537 objects totaling 1,077,076,750 bytes.
- Auth clone: the required Google-authenticated admin identity, Google provider, and authorized-domain configuration were established.
- Public hierarchy checks previously matched source/target model, SKU, package, and Offer counts.
- Firebase project IDs, service accounts, buckets, Hosting sites, Function URLs, webhook secrets, and runtime state remain isolated.

The copied historical documents remain isolated staging copies. No staging runtime may mutate the source project.

## Function inventory

| Surface | Count |
|---|---:|
| Canonical local source exports | 65 |
| Original deployed Functions | 63 |
| Expected staging Functions | 63 |
| Deployed staging Functions | 63 |
| Expected Functions missing from staging | 0 |
| Unexplained extra staging Functions | 0 |

### Required environment exclusions

These canonical exports must not be deployed to staging because they are live-only:

- `createLiveOfferCheckout`
- `paddleLiveWebhook`

### Approved new staging surface

- `adminVipPromoCodes` — Spec 148, not present in the original deployment.

### Obsolete original surface

- `adminWorkshopProjectCleanEmpty` — deployed in the original project but removed from canonical source. Do not resurrect it without a separate compatibility finding.

### Reconciled staging surfaces

All 63 expected staging Functions are deployed from the canonical source. The three GitHub-dependent Functions use a Secret Manager binding; the remaining Functions use the normalized staging environment. No live-only Paddle endpoint is present.

## Classification

| Difference | Classification | Decision |
|---|---|---|
| Project IDs, URLs, buckets, service accounts | Required environment substitution | Keep isolated |
| Sandbox Paddle versus Paddle Live | Required environment substitution | Sandbox only in staging |
| Staging noindex and test email labeling | Required environment substitution | Keep |
| Project identity/webhook guards | Approved Spec 149 change | Keep after tests |
| Controlled ZPK delivery/rules | Approved Spec 149 change | Keep after tests |
| `adminVipPromoCodes` | Approved Spec 148 change | Keep staging-only pending matrix |
| Previously missing canonical staging Functions | Missing clone surface, resolved | Restored |
| Per-Function environment drift | Accidental divergence, resolved | Normalized |
| Explicit Paddle transaction checkout URL | Baseline behavior, restored | Keep |

## Secret binding readiness

- `PADDLE_SANDBOX_API_KEY`: present.
- `PADDLE_SANDBOX_WEBHOOK_SECRET`: present.
- `RESEND_API_KEY`: present.
- `GITHUB_TOKEN`: present in staging Secret Manager and bound only to the three GitHub-dependent Functions. The owner approved temporary reuse of the current credential until its planned 60-day rotation.

## Gate status

**AMBER.** Function parity, rule deployment, direct paid-file denial, cross-project order isolation, and the successful Sandbox checkout/fulfillment/download path are green. The accepted Sandbox domain is `flowvault-staging-2026.web.app`. The verified purchase produced one paid order, one successful initial ZPK transfer, zero recovery transfers, and zero stuck reservations; the same order is absent from production Firestore. Stable staging now returns real HTTP 404 responses for invalid routes, preserves the dynamic success route, serves 105 prerendered SEO routes, enforces CSP/HSTS/noindex, and uses a 384,701-byte public entry bundle with Admin/Studio Firebase-auth code removed. Declined-payment, physical QR installation, recovery/limit, remaining Spec 148 Sandbox cases, and owner inbox confirmation are still required before the full gate becomes green.
