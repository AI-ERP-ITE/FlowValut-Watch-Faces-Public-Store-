# Spec 145 — Implementation Plan

## Solution-fit summary

Reuse the existing Offer-centric Spec 122 architecture. `offers` already owns composition, USD regular/campaign prices, currency, state, and environment-specific Paddle mappings. Release Wizard already edits Offer pricing and bundle composition; Admin Ops already provides the authenticated operational surface. The implementation therefore extends these paths and the existing Firebase Functions backend rather than creating a parallel product database or Paddle dashboard clone.

## Phase 0 — Read-only inventory and contracts

1. Snapshot eligible Firestore Offers and their hierarchy context.
2. Inspect Paddle Sandbox catalog read-only when credentials/MCP access exist.
3. Generate a deterministic dry-run classification: create, reconcile, update, archive, or review.
4. Confirm `digital-goods` is enabled for the Paddle account before bulk writes; otherwise stop with an actionable account prerequisite.
5. Freeze request/response schemas and the 22-Offer baseline fixture.

## Phase 1 — Pure domain model

1. Add centralized currency/minor-unit conversion with currency precision metadata.
2. Add commerce pricing-policy validation for global promotion and localized defaults.
3. Expand environment-specific Offer mapping types compatibly with Spec 144.
4. Add canonical desired-state normalization and stable hashing.
5. Add active Price selection and commercial-readiness predicates.
6. Unit-test money, promotion, mapping migration, environment isolation, and hashes.

## Phase 2 — Paddle catalog adapter

1. Add a focused backend Paddle catalog client using the existing Sandbox/production API-base and secret-selection contract.
2. Implement list/get/create/update/archive Product operations.
3. Implement list/get/create/archive Price operations with one-time quantity-one and localized overrides.
4. Attach stable FlowVault Offer/environment identity in Paddle `custom_data`.
5. Normalize Paddle errors into safe internal categories without logging credentials or raw authorization data.
6. Test with a fake adapter; no network dependency in unit tests.

## Phase 3 — Minimal idempotent synchronization

1. Add one small sync service that receives the authoritative Offer, commerce policy, environment mapping, and Paddle adapter.
2. Reuse saved IDs first, then match stable FlowVault `custom_data` before creating anything.
3. If the desired-state hash and objects already match, return the existing mapping without writes.
4. Create/update the Product and reuse matching Prices; create replacements only when amounts/overrides changed.
5. Persist the resulting mapping/status/hash on the existing Offer document in one Firestore transaction.
6. Archive superseded Prices only after the replacement mapping is saved.
7. Use the existing `SYNCING` status as a simple concurrent-run guard; do not introduce a queue or separate lease subsystem.

## Phase 4 — Authenticated Admin endpoints

1. Add one-off sync, reconciliation/status, archive, dry-run inventory, and bounded bulk-sync endpoints.
2. Reuse existing Firebase ID-token Admin authorization, rate limiting, CORS, and payload validation.
3. Enforce Sandbox-only mutation for this delivery.
4. Return sanitized per-Offer outcomes; bulk work uses a small bounded sequential batch.
5. Bind only `PADDLE_SANDBOX_API_KEY` on Sandbox mutation endpoints.

## Phase 5 — Release/publication integration

1. Preserve the current Workshop/Technical Package release state machine.
2. Add a separate commercial-readiness gate after Offer/fulfillment validation.
3. Trigger or queue Sandbox catalog sync for eligible paid Offers at the existing release boundary.
4. Preserve released content on sync failure while preventing paid checkout.
5. Ensure retries resume catalog sync rather than rerunning artifact publication.

## Phase 6 — Existing Admin UI extension

1. Add shared typed Admin API methods.
2. Add a compact Paddle panel to Release Wizard/Admin Ops using the current design system.
3. Show mappings, active Price, status, timestamps, readiness, and safe errors.
4. Add Sync, Resync, Retry, Refresh, and guarded Archive actions.
5. Add a dry-run-first bulk Sandbox sync UI with per-Offer outcomes and review list.
6. Never display or request backend Paddle credentials in the browser.

## Phase 7 — Checkout and public read-model hardening

1. Replace the transitional Spec 144 single `priceId` resolver with explicit server-side active Price resolution.
2. Require `SYNCED`, correct environment, current desired-state hash, eligible Offer, and active Product/Price.
3. Omit Paddle mapping IDs from public read-model responses unless a demonstrated UI need exists.
4. Preserve backend-created Paddle transaction and webhook-authoritative fulfillment.
5. Extend order/webhook validation regression coverage for replacement Prices.
6. Verify Paddle remains payment-only and has no QR, ZPK, package, token, or installation responsibility; all such behavior stays in the existing FlowVault fulfillment path.

## Phase 8 — Migration and reporting

1. Run dry-run against Firestore and Paddle Sandbox.
2. Stop and report any ambiguous or pre-existing unmatched Paddle objects.
3. Bulk synchronize eligible Offers in bounded batches with checkpoints.
4. Reconcile every created/reused Product and Price.
5. Persist and export the requested complete mapping table.
6. Do not touch Paddle production.

## Phase 9 — Verification and staged deployment

1. Run focused frontend/backend tests and explicit public/private builds.
2. Run compiled-output credential scan.
3. Deploy Firestore indexes/rules only if changed.
4. Deploy only changed Sandbox Functions using explicit project and endpoint list.
5. Verify Functions list and endpoint contracts.
6. Deploy the private Admin surface through the canonical private workflow only after a clean commit-scope review.
7. Redeploy isolated `flowvault-staging` Hosting and run the Sandbox payment/webhook/entitlement/download matrix.
8. Verify production checkout remains disabled and production Paddle catalog is untouched.

## Expected file scope

Exact filenames may adjust after dependency tracing, but expected changes are:

- `app/src/lib/storeArchitecture.ts`
- `app/src/lib/storeHierarchyApi.ts`
- `app/src/lib/storeReadModel.ts`
- `app/src/lib/studioFirebasePublishApi.ts`
- `app/src/components/ReleaseWizard.tsx`
- `app/src/components/storefront/AdminOpsPage.tsx`
- `app/src/components/storefront/OfferBuyPage.tsx` only if status messaging requires it
- `firebase/functions/src/commerceMoney.ts` (new)
- `firebase/functions/src/paddleCatalogModel.ts` (new)
- `firebase/functions/src/paddleCatalogAdapter.ts` (new)
- `firebase/functions/src/paddleCatalogSync.ts` (new)
- focused `.test.ts` files for each pure/backend domain
- `firebase/functions/src/index.ts` for thin exports/integration
- `firebase/firestore.indexes.json` if bulk/status queries require indexes
- `firebase/functions/.env.example` for non-secret configuration documentation only
- `app/docs/PADDLE_CATALOG_SYNC.md` (new implementation runbook)

## Deployment prerequisites

1. Paddle Sandbox API key with product read/write and price read/write permissions stored as `PADDLE_SANDBOX_API_KEY` in Firebase Secret Manager.
2. Paddle `digital-goods` tax category enabled or explicitly confirmed; if unavailable, owner must select/approve the correct enabled category before creation.
3. Sandbox client token and webhook secret from Spec 144 for end-to-end checkout testing.
4. No production credentials or production catalog mutation authorization is required for this task.

## Rollback

1. Disable Sandbox checkout and automatic catalog synchronization.
2. Preserve FlowVault mappings, sync audit, orders, and Paddle objects.
3. Restore the previous active Price mapping if a replacement rollout fails.
4. Archive only newly unusable current Prices after confirming no checkout references them.
5. Roll back Firebase Functions and Admin UI independently.
6. Never delete historical Paddle objects or transaction records.

## Commit discipline

1. Commit this spec/plan/tasks separately from implementation.
2. Keep implementation commits separate from deploy artifacts.
3. Preserve unrelated dirty-worktree changes.
4. If the parent repository tracks `app` as a pointer, update that pointer in its own final commit.
