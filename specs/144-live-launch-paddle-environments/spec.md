# Spec 144 — Live Launch Paddle Environments

**Created:** 2026-08-07  
**Status:** Approved specification; runtime implementation pending staged approval  
**Domain:** Public storefront + Firebase backend + Firebase Hosting  
**Production:** `https://www.fvwatchfaces.com`  
**Staging:** `https://flowvault-staging.web.app`

## Authority

This specification governs the staging preparation for FlowVault's public-store launch. It extends Spec 122's Offer, entitlement, and Technical Package architecture without replacing the existing product hierarchy or creating a second application codebase.

## Goal

Produce two builds from the private FlowVault source:

1. Staging deploys to the dedicated Firebase Hosting site `flowvault-staging` and uses Paddle Sandbox.
2. Production deploys through the existing artifact-only public GitHub Pages repository and is prepared for Paddle Live while checkout remains disabled.

Production sales are not activated by this specification.

## Non-goals

1. No third-party creator marketplace, revenue split, or creator payout system.
2. No redesign of the public storefront.
3. No production DNS change.
4. No Paddle-hosted catalog or storefront.
5. No activation of Paddle Live checkout.
6. No replacement of Spec 122 Offers, SKU entitlements, Technical Packages, or secure downloads.
7. No storage of raw card data.

## Environment contract

The frontend must consume one centralized public-safe configuration object:

```ts
type FlowVaultEnvironment = 'staging' | 'production';
type PaddleEnvironment = 'sandbox' | 'production';

interface FlowVaultConfig {
  environment: FlowVaultEnvironment;
  checkoutEnabled: boolean;
  paddleEnvironment: PaddleEnvironment;
  purchaseFunctionsBaseUrl: string;
  paddleClientToken?: string;
}
```

Required states:

| Target | Deployment | Checkout | Paddle |
|---|---|---:|---|
| Staging | `flowvault-staging.web.app` | enabled | Sandbox |
| Production | `www.fvwatchfaces.com` | disabled | Live configuration only |

Hostname checks must not control environment behavior. Build configuration is authoritative.

## Functional requirements

### FR-1 Single source and isolated deployments

1. The private repository remains the only source-code authority.
2. A staging build is deployed only to Firebase Hosting site `flowvault-staging`.
3. A production build continues through the existing public artifact deployment.
4. Staging deployment must not modify the public Git remote, CNAME, production DNS, or production Hosting channel.
5. Production deployment must not contain a Sandbox client token, Sandbox Price ID, or Sandbox indicator.

### FR-2 Checkout kill switch

1. `CHECKOUT_ENABLED` is the single purchase activation switch.
2. Production defaults to false.
3. When false, purchase CTAs render an intentional unavailable/Coming Soon state and never call a checkout endpoint or initialize Paddle.
4. The backend independently rejects checkout creation for a disabled environment.
5. Free fulfillment must also follow an explicit policy; it must not bypass a disabled production purchase gate accidentally.

### FR-3 Paddle frontend

1. Only Paddle browser-safe client-side tokens may enter the frontend build.
2. Staging initializes Paddle.js in Sandbox mode.
3. Production does not initialize Paddle while checkout is disabled.
4. Overlay Checkout is preferred and FlowVault remains the visible storefront.
5. Frontend checkout events improve UX only and never grant an entitlement.

### FR-4 Backend environment separation

1. Paddle Sandbox and Live use separate API-key and webhook-secret bindings.
2. Webhooks use explicit environment endpoints:
   - `paddleSandboxWebhook`
   - `paddleLiveWebhook`
3. Each endpoint binds only its corresponding secret and rejects the other environment.
4. Checkout creation uses an explicit requested build environment that is validated against server configuration and allowed origins.
5. Existing generic webhook aliases may remain temporarily for compatibility but must not become an environment bypass.

### FR-5 Product and price mapping

1. Existing Spec 122 Offer documents remain commercial authority for composition and displayed price.
2. Each sellable Offer gains environment-specific Paddle references with the minimum additive schema change.
3. Sandbox checkout resolves only Sandbox Product/Price IDs.
4. Live checkout resolves only Live Product/Price IDs.
5. Dynamically constructed Paddle prices are not used for the final environment-separated checkout.
6. Missing or mismatched mappings fail closed.

### FR-6 Transaction validation

Before fulfillment, the server must verify:

1. Paddle signature with the endpoint-specific secret.
2. Event and transaction environment.
3. `transaction.completed` status.
4. Transaction ID and related FlowVault order ID.
5. Expected Paddle Price ID and Offer mapping.
6. Expected amount and currency against the immutable order snapshot.
7. Transaction has not already been fulfilled.

The browser is never payment authority.

### FR-7 Auditability and idempotency

1. Orders include `provider`, `environment`, transaction ID, Paddle price/product references, amount, currency, payment status, timestamps, customer reference where appropriate, and entitlement status.
2. Paddle transaction ID is unique within its environment.
3. Webhook event identity includes the environment to avoid cross-environment collisions.
4. Replayed events do not duplicate entitlements, tokens, downloads, or emails.
5. Sandbox records are excluded from production revenue queries.

### FR-8 Entitlements and downloads

1. Verified webhooks remain the only authority for paid entitlements.
2. Existing Spec 122 SKU-entitlement and Technical Package resolution is preserved.
3. Released ZPKs remain in private Cloud Storage and are delivered through controlled short-lived authorization.
4. Sandbox entitlements are visibly marked and cannot be interpreted as production purchases.
5. Legacy order/download behavior remains compatible but the simulated paid-order endpoint must not be a production purchase path.

### FR-9 Email

1. No email is sent until payment is verified and fulfillment succeeds.
2. If an email provider is later configured, Sandbox messages must state TEST / SANDBOX.
3. Absence of an existing email provider is documented and does not authorize adding one without separate configuration.

### FR-10 Staging presentation and access

1. Staging shows a persistent, subtle `SANDBOX / TEST MODE` indicator.
2. Production never shows the indicator.
3. Staging is not linked from production or indexed by search engines.
4. The staging site may initially rely on obscurity plus Sandbox-only enforcement; no hardcoded frontend password is permitted.

### FR-11 Deployment safety

1. Add explicit `build:staging`, `deploy:staging`, and `build:production` commands while preserving canonical production deployment conventions.
2. Staging deploy targets only `flowvault-staging` with explicit Firebase project `zeppfaceloader-b0b106e9`.
3. Public artifact deployment runs a secret scan before staging or pushing output.
4. The scan rejects Paddle API keys, webhook secrets, service-account private keys, GitHub credentials, and other backend credential patterns.
5. Safe Firebase browser configuration and Paddle client-side tokens are allowlisted by type, not by hardcoded secret value.
6. Deployment scripts must preserve unrelated user work and must not stage all dirty source files accidentally.

## Data-model direction

The implementation must inspect actual Offer documents before choosing the final field names. The preferred additive shape is conceptually:

```ts
paddle?: {
  sandbox?: { productId: string; priceId: string };
  production?: { productId: string; priceId: string };
}
```

Orders and webhook records must add an explicit `environment: 'sandbox' | 'production'`. Existing production reporting must filter `environment == 'production'`; records without the field remain legacy and must not be silently counted as Live Paddle revenue.

## Security requirements

1. Paddle API keys and webhook secrets use Firebase Secret Manager bindings.
2. Secrets never enter HTML, JavaScript bundles, public JSON, Firestore client-readable documents, localStorage, sessionStorage, or the public repository.
3. Raw credential values must never be logged.
4. Download tokens must not be logged.
5. CORS is not authorization; endpoints validate environment, origin, payload, and server-side records.
6. Production checkout remains disabled in both frontend and backend until explicit later approval.

## Test matrix

1. Successful Sandbox transaction.
2. Declined Sandbox payment.
3. Cancelled checkout.
4. Duplicate webhook event.
5. Invalid webhook signature.
6. Unknown or mismatched Price ID.
7. Completed webhook after browser closure.
8. Frontend success event without webhook.
9. Success-page refresh/recovery.
10. Repeat download within and beyond existing limits.
11. Sandbox purchase excluded from production revenue.
12. Production purchase CTA disabled and no checkout network call occurs.
13. Production bundle contains no Sandbox token or Price ID.
14. Staging Functions bind no Live webhook secret or Live API key.
15. Responsive checkout on desktop, tablet, and mobile.
16. Cross-environment webhook and transaction rejection.
17. Free-order behavior obeys the environment kill switch.

## Live activation gate

Live checkout may be enabled only after all of the following:

1. Paddle approves the FlowVault Live account.
2. Live products and prices exist.
3. Live client token is configured.
4. Live API key and webhook secret are stored as Firebase secrets.
5. Live webhook destination is configured.
6. Live Offer mappings are complete.
7. One controlled Live transaction proves webhook → entitlement → download and any configured email.
8. Production output passes secret and Sandbox-ID scanning.
9. Explicit owner approval changes production `CHECKOUT_ENABLED` to true.

## Acceptance criteria

1. `flowvault-staging.web.app` serves a Sandbox-marked store and production remains unchanged.
2. A successful Sandbox webhook, including when the browser is closed, creates exactly one Sandbox order fulfillment and controlled entitlement.
3. Invalid, duplicate, cross-environment, incorrectly priced, or incomplete events do not grant entitlement.
4. `www.fvwatchfaces.com` displays the existing store with purchasing intentionally unavailable and never initializes Live or Sandbox checkout.
5. Sandbox data is excluded from production accounting.
6. No sensitive Paddle or backend credential exists in compiled public output.
7. Live activation later requires configuration and the explicit switch only, not an architectural rewrite.

