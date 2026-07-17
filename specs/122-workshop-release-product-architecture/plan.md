# Spec 122 — Implementation Plan

## Delivery principle

Implement additively behind compatibility adapters. Do not replace the flat catalog, current order path, or current publish flow until the corresponding new path is proven and migrated. Each phase has its own approval, tests, commit, and rollback point.

## Phase 1 — Contracts and read-only foundations

1. Introduce domain types and runtime validators for Workshop, store hierarchy, Offers, entitlements, lifecycle states, and legacy mappings.
2. Rename physical-watch domain terminology to Device in new code while preserving existing `models.json` compatibility.
3. Add Firestore collection/path constants and public/private read models.
4. Add storage-key builders for Workshop snapshots and released Technical Packages.
5. Add feature flags so no existing production behavior changes yet.

## Phase 2 — Workshop persistence

1. Reuse the existing `.fvwf` serialization/import path as the sole editor-project format.
2. Add authenticated upload/fetch endpoints suitable for binary `.fvwf` and ZPK artifacts.
3. Create Workshop Project and numbered immutable Workshop Build metadata.
4. Change the test-time action to `Create Watch Test` and upload the paired artifacts only on that action.
5. Add build history, notes, download, approval, and `Open in Studio` behavior.

## Phase 3 — Lifecycle and cleanup correctness

1. Preserve Take Offline as a store-visibility action.
2. Introduce real Trash/Restore states for Workshop and eligible draft records.
3. Replace swallowed hard-delete errors with verified object-by-object deletion.
4. Add dependency guards, typed confirmation, audit records, and historical-path orphan scanning.
5. Add storage-usage reporting and non-destructive cleanup suggestions.

## Phase 4 — Product hierarchy and release wizard

1. Add Design DNA, Collection, Design Model, Variant, Edition, SKU, Technical Variant, Revision, and Offer administration.
2. Build one shared wizard callable from Studio and Admin.
3. Add normalized duplicate checks and classification guidance.
4. Generate canonical customer names and internal product codes.
5. Save READY records independently from LIVE activation.

## Phase 5 — Deterministic release repack

1. Inventory all name-bearing manifests in V2 and V3 ZPK structures.
2. Implement metadata-only repacking of an approved test ZPK.
3. Add allowlisted structural comparison and SHA-256 parity reporting.
4. Store approved source, released derivative, validation report, target, and revision as a Technical Package release.
5. Block activation on any non-allowlisted difference or embedded-name mismatch.

## Phase 6 — Public read model and storefront

1. Produce a storefront-specific Design Model read model from the new hierarchy.
2. Add collection, Design Model, and Device routes with legacy redirects.
3. Update cards and product pages to select Variants, Editions, and Offers.
4. Preserve MAIN/AOD previews and current visual language.
5. Add Unique Models/Sellable SKUs reporting and finished-timepiece messaging.

## Phase 7 — Offers, checkout, and fulfillment

1. Create server-authoritative Offer pricing.
2. Store immutable order and SKU-entitlement snapshots.
3. Resolve current Technical Packages by owned SKU and selected Device.
4. Support Complete Color Collections and future package revisions.
5. Preserve the legacy product-order/download resolver.

## Phase 8 — Migration and cutover

1. Backfill one temporary Design Model/SKU/Technical Package per legacy entry.
2. Populate legacy-ID mappings and manual classification queue.
3. Reconcile historical Storage objects with Firestore references.
4. Validate old routes, orders, download tokens, prices, and catalog visibility.
5. Enable new read paths gradually; retain rollback flags until verified live.

## Phase 9 — Verification and deployment

1. Run focused tests after every phase.
2. Build and verify Firebase Functions before targeted deployment.
3. Deploy required Firestore/Storage configuration explicitly.
4. Verify expected Functions in `functions:list`.
5. Run public and private builds plus repository verification.
6. Deploy with `npm run deploy:full:public`, which restores and pushes the private bundle.
7. Verify live public/private hashes, assets, routes, catalog, auth, and compatibility paths.

## Commit policy

1. Specification files are committed alone.
2. Backend/data changes, private UI changes, public UI changes, tests, and generated deploy artifacts use separate commits when practical.
3. Existing unrelated user modifications are never included or overwritten.

## Rollback policy

1. New collections and fields are additive until cutover.
2. Feature flags restore legacy publishing, catalog, and fulfillment reads.
3. Approved test ZPKs are immutable and never overwritten by repacking.
4. Migrations write audit/checkpoint records and support dry-run mode.
5. Public deployment is blocked unless private restoration is also successful.

