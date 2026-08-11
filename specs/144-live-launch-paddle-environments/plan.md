# Spec 144 — Implementation Plan

## Delivery principle

Build additively around the existing Spec 122 Offer and entitlement flow. Preserve the current production storefront until the final production-safe build is deliberately deployed. Each phase requires its own approval under the repository SpecKit workflow.

## Phase 1 — Configuration and testable contracts

1. Add `app/src/config/flowVaultConfig.ts` as the single frontend environment authority.
2. Add runtime validation for environment, checkout switch, purchase Functions URL, and Paddle client token requirements.
3. Add `.env.staging` and update `.env.public` with public-safe non-secret switches only.
4. Change package scripts so staging and production builds explicitly select their target.
5. Add unit tests proving production checkout is false and staging cannot select Live Paddle.

## Phase 2 — Production kill switch and staging UI

1. Route `ProductPage`, `BuyPage`, and `OfferBuyPage` through centralized checkout availability.
2. Ensure disabled checkout renders a clean Coming Soon/unavailable state and performs no purchase call.
3. Add a staging-only Sandbox/Test Mode indicator and `noindex` behavior.
4. Preserve current branding, layout, routes, and responsive behavior.

## Phase 3 — Environment-aware Offer mapping

1. Extend shared Offer validation/types with additive Paddle Sandbox/production references.
2. Update Admin/release persistence only where required to preserve mappings.
3. Add backend mapping resolution that fails closed for missing or cross-environment Price IDs.
4. Add migration/report tooling to identify active Offers missing Sandbox or Live mappings without inventing temporary IDs.

## Phase 4 — Backend checkout separation

1. Extract Paddle environment/secret selection out of the monolithic Functions file into a focused module where practical.
2. Replace dynamic Paddle price construction with mapped Price IDs.
3. Store immutable environment, Offer, Price ID, amount, and currency snapshots on orders.
4. Add backend checkout enablement enforcement independent of the frontend switch.
5. Preserve free and legacy compatibility while preventing simulated paid orders from acting as production checkout.

## Phase 5 — Webhook hardening

1. Add separate `paddleSandboxWebhook` and `paddleLiveWebhook` exports.
2. Bind each endpoint to only its corresponding Firebase webhook secret.
3. Validate raw-body signature, environment, completed status, transaction ID, order link, Price ID, amount, and currency.
4. Make event and transaction idempotency environment-aware.
5. Create entitlement and token in a transaction-safe fulfillment path.
6. Remove raw download-token logging.

## Phase 6 — Paddle.js Overlay Checkout

1. Add the current official Paddle.js loader/initialization pattern.
2. Initialize Sandbox only in the staging build and only when checkout is enabled.
3. Open Overlay Checkout using the backend-created transaction.
4. Retain server polling/recovery for UX, but keep webhook authority.
5. Add success/recovery behavior that survives refresh and browser closure.

## Phase 7 — Firebase Hosting and deployment safety

1. Add a named Hosting target/site configuration for `flowvault-staging` without changing the default site.
2. Configure Hosting to serve `app/dist` as an SPA with appropriate caching and security headers.
3. Add `scripts/deployStaging.mjs` or the closest convention-compatible script using explicit project/site targeting.
4. Add a compiled-output credential scanner.
5. Integrate the scanner into staging deployment and before the existing public production push.
6. Ensure staging scripts never run the public Git remote workflow.

## Phase 8 — Firestore separation and reporting

1. Add required environment fields and indexes to orders, webhook events, and entitlements.
2. Update production reporting/query helpers to require production environment explicitly.
3. Preserve legacy records through an explicit legacy classification.
4. Deploy Firestore indexes/rules only if changed and verify them separately.

## Phase 9 — Documentation and verification

1. Create `app/docs/PADDLE_ENVIRONMENTS.md` without actual secrets or identifiers that are not safe to publish internally.
2. Build frontend and Functions.
3. Run focused unit tests plus the full payment matrix possible without Dashboard credentials.
4. Deploy only changed Functions using explicit project and endpoint names.
5. Deploy staging Hosting only and verify `flowvault-staging.web.app`.
6. Verify production remains unchanged and checkout-disabled source/build gates pass.
7. Record exact user-entered secrets, Paddle Dashboard settings, webhook URL, commands, and blockers.

## Expected files

Exact paths may be adjusted after implementation-level dependency tracing, but the intended scope is:

- `app/package.json`
- `app/vite.config.ts`
- `app/.env.staging`
- `app/.env.public`
- `app/src/config/flowVaultConfig.ts` (new)
- `app/src/config/flowVaultConfig.test.ts` (new)
- `app/src/lib/purchaseApi.ts`
- `app/src/lib/storeArchitecture.ts`
- `app/src/components/storefront/ProductPage.tsx`
- `app/src/components/storefront/BuyPage.tsx`
- `app/src/components/storefront/OfferBuyPage.tsx`
- `app/src/components/storefront/StorefrontLayout.tsx` or the existing shared shell
- `app/scripts/scanPublicBuildForSecrets.mjs` (new)
- `app/scripts/deployStaging.mjs` (new)
- `app/scripts/deployPublicFull.mjs`
- `firebase/firebase.json`
- `firebase/.firebaserc` or an explicit target configuration (new if required)
- `firebase/functions/src/index.ts`
- `firebase/functions/src/paddle.ts` (new if extraction remains minimal)
- `firebase/functions/src/paddle.test.ts` (new)
- `firebase/functions/src/offerFulfillment.test.ts`
- `firebase/firestore.indexes.json` if environment queries require an index
- `app/docs/PADDLE_ENVIRONMENTS.md` (new)

## Deployment order

1. Local contract tests and builds.
2. Firebase secrets entered by the owner.
3. Targeted Sandbox Functions deployment.
4. Functions listing and endpoint verification.
5. Staging Hosting deployment.
6. Live staging test matrix.
7. Production-safe build verification with checkout disabled.
8. Production deployment only after a separate explicit approval.

## Rollback

1. Set checkout disabled in the affected environment.
2. Redeploy the last known-good staging Hosting version or roll back its Hosting release.
3. Leave production untouched during Sandbox rollback.
4. Disable the Sandbox webhook destination if fulfillment must stop immediately.
5. Preserve order/webhook audit records; never delete transaction history as rollback.

## Commit policy

1. Commit this specification and plan separately from runtime implementation.
2. Keep backend, frontend, deployment scripts, and generated deployment artifacts separated where practical.
3. Do not include unrelated existing worktree modifications.
4. Never push source or secrets to the public artifact repository.

