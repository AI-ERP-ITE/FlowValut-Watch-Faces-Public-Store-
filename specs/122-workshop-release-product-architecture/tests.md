# Spec 122 — Test Matrix

## Workshop persistence

- Create an unnamed Workshop Project and verify a useful generated title.
- Create 100 test builds without store metadata.
- Verify build numbers are atomic and unique under concurrency.
- Round-trip each saved `.fvwf` through the existing Studio loader.
- Verify the saved `.fvwf` corresponds to the exact paired ZPK build state.
- Open a historical build in a new Studio tab and create the next linked build.
- Reject unauthorized FVWF/ZPK fetches and uploads.
- Generate and store the established Zepp direct-install QR beside the exact finalized Workshop Test ZPK, using a stable Workshop ZPK path without publishing the build.
- Preserve the already-generated FVWF/ZPK pair after a Workshop upload failure and retry those same artifacts without rebuilding.
- Show an explicit empty-project state instead of silently hiding approval/release controls when no build finalized.

## Naming and release wizard

- Detect duplicates across case, punctuation, spacing, and Unicode-normalized equivalents.
- Generate names with and without optional Variant/Edition components.
- Generate stable internal codes for all hierarchy combinations.
- Block model-number reuse inside one Collection.
- Block direct enablement when required hierarchy, Offer, or package data is incomplete.
- Verify Studio and Admin use the same wizard and backend command.

## ZPK metadata-only repack

- V2 and V3 fixtures with outer/app-side/device-side manifests.
- Confirm every required embedded name becomes canonical.
- Confirm JS, PNG, layout, targets, and non-name manifests retain identical SHA-256 values.
- Reject an unexpected JS, image, target, or manifest-field change.
- Reject malformed/nested package corruption.
- Prove the approved source ZPK remains unchanged.
- Prove release fails when the resulting embedded name is not canonical.

## Lifecycle and deletion

- Take Offline preserves every object and entitlement.
- Trash preserves every object and records previous state.
- Restore returns to the valid previous state.
- Permanent delete rejects non-trashed records.
- Permanent delete rejects current, purchased, promoted-required, and referenced packages.
- Simulated Storage permission/network failure prevents Firestore deletion and returns object-level results.
- Already-absent expected objects are distinguished from unexpected errors.
- Orphan scan finds historical/unreferenced objects without deleting them.

## Storefront

- One Design Model with three Variants renders one card.
- Variant/Edition selections update canonical name, media, availability, and Offer.
- Technical Variants do not create additional artistic cards.
- Collection and Device pages return correct Design Models.
- Unique Design Model and Sellable SKU counts remain distinct.
- Finished-timepiece messaging is visible and accessible.
- Public build contains no private Admin/Studio routes.

## Offers, orders, and fulfillment

- Individual Offer grants one SKU.
- Complete Color Collection grants every included SKU.
- Regular and soft-opening prices are server authoritative.
- Device selection resolves the correct current Technical Package.
- A new revision replaces CURRENT while retaining historical package safety.
- Adding a compatible Device makes the appropriate package available to existing owners.
- Legacy orders and tokens continue to download the original entitlement.
- Refund and download-limit behavior remains intact.

## Migration

- Dry run makes no writes.
- Every legacy entry receives exactly one temporary mapping.
- Similar names are never automatically consolidated.
- Legacy routes and QR links resolve after backfill.
- Re-running migration is idempotent.
- Partial failure resumes from checkpoints without duplicate records.

## Security and deployment

- All private mutations reject unauthenticated and non-Admin users.
- Payload sizes, content types, IDs, paths, and lifecycle transitions are validated.
- Public endpoints expose no private artifact paths or editor projects.
- Functions build and targeted deployment succeed.
- `functions:list` contains every expected endpoint.
- Public/private route exposure, hashed assets, catalog, and live compatibility URLs pass.

## Post-audit hardening regressions

- Failed FVWF/ZPK upload aborts its reserved build and cleans every uploaded object before surfacing failure.
- Opening Build N and creating another test records Build N as `parentBuildId`.
- Loading a local `.fvwf` clears any prior Workshop project/build identity.
- Only `TESTING` builds can be approved; only `APPROVED` builds can open release classification.
- Trash requires a reason; permanent deletion requires Trash plus `DELETE <project>/<build>` and rejects release references.
- Storage maintenance recognizes `releases/` and counts approved/released/parity paths as referenced.
- Existing DNA/Collection/Model/SKU choices constrain downstream dropdowns; technical target is detected, not freely typed.
- Model numbers are unique inside a Collection and bundle SKUs belong to one Design Model.
- `READY` packages can resume as `VALIDATING`; `VALIDATING` retries resume; `CURRENT` retries return the existing result.
- Existing immutable release objects are reused only when their hashes and parity identity match exactly.
- Reopening a classified build restores its hierarchy and revision instead of creating a duplicate package.
## Technical Target propagation and recovery

- Canonical model IDs, exact display names, and vendor-prefixed legacy display names resolve to the same Technical Target.
- Ambiguous normalized model names fail closed instead of guessing.
- New Workshop build reservations reject a missing Technical Target.
- Release classification rejects a selected target that conflicts with the approved build target.
- A legacy approved build with no saved target can use the existing release field to select a verified configured target.

## Post-audit stabilization evidence

- Public catalog/media responses do not expose released or Workshop ZPK paths; entitlement fulfillment remains the delivery authority.
- Repeating a partially completed release accepts existing artifacts only when their hashes and immutable release identity match.
- Reopening classification restores description, story, categories, tags, Offer type, included colors, and pricing.
- A Complete Color Collection contains at least two SKUs from one Design Model and remains Draft until every included SKU is CURRENT for the same Technical Target.
- Checkout rejects a selected device before order/payment creation unless every included SKU has exactly one CURRENT released package for that device target.
- Workshop permanent deletion requires Trash plus typed confirmation, blocks release references, and retains Firestore records when Storage deletion cannot be verified.
- Functions compile and tests pass: 20/20.
- Focused Workshop/storefront tests pass: 21/21.
- Canonical public and private production builds pass.
- Full Studio baseline is unchanged: 34 test files and 187 tests pass; the same 11 unrelated rendering/effects tests fail.
