# Spec 122 — Validation Gates

## Per-phase code gates

1. Focused unit and integration tests pass.
2. TypeScript passes with no new errors.
3. No direct GitHub write fallback or browser token dependency is introduced.
4. Existing user changes and unrelated specs remain untouched.
5. The implementation diff is the smallest practical extension of existing pipelines.

## Workshop gates

- Inspect a cloud-saved `.fvwf` and locally saved `.fvwf` for equivalent restoration content.
- Load MAIN/AOD projects through the existing loader and compare canvas/config state.
- Install a paired test ZPK on a physical watch and record the Workshop Build ID.
- Confirm Admin opens the exact paired project in Studio.

## Release gates

- Promote the physically tested build.
- Inspect every nested ZPK manifest and confirm canonical embedded name.
- Review the stored parity report.
- Independently extract approved/released packages and compare all non-allowlisted entries.
- Install the released package and confirm its watch-visible name and tested behavior.

## Lifecycle gates

- Demonstrate Take Offline, Bring Online, Trash, Restore, and Permanent Delete as distinct operations.
- Force one Storage deletion failure and prove the Firestore record remains with actionable diagnostics.
- Run orphan scan against historical layouts and confirm no automatic deletion.

## Migration gates

- Review dry-run totals with enabled/offline/order/orphan breakdowns.
- Sample legacy mappings across free, paid, enabled, offline, and historical-path entries.
- Verify legacy public URLs, QR links, orders, tokens, and downloads before and after cutover.
- Confirm rollback flag restores the legacy read path.

## Build gates

From `app/`:

```powershell
npm run build:public

# after loading .env.private.local and running its preflight
npm run build:private

node scripts/verify.mjs
```

From `firebase/functions/`:

```powershell
npm run build
```

## Live gates

- Firebase targeted deploy reports successful create/update for every changed endpoint.
- `functions:list --project <project-id>` contains expected endpoints.
- Public homepage, Collection, Design Model, Device, checkout, and legacy routes resolve.
- Private login, Studio Workshop open, Admin lifecycle, and release wizard resolve.
- Public and private HTML reference live hashed JS/CSS assets, never `/src/main.tsx`.
- Public `catalog.json` remains HTTP 200 during compatibility operation.
- Origin/public commit hashes and deployed bundle hashes are recorded.

## Closure rule

Spec 122 cannot be marked complete while any required migration, entitlement, deletion-safety, ZPK-parity, security, deployment, or live-compatibility gate remains unresolved.

## Phase 2 evidence — 2026-07-17

- Focused Vitest suites: 3 files, 12 tests passed.
- App TypeScript: `npx tsc --noEmit` passed.
- Firebase Functions TypeScript: `npm run build` passed.
- Private Vite production build with the Workshop flag enabled passed.
- Targeted Firebase deployment created the six Workshop endpoints only.
- `functions:list --project zeppfaceloader-b0b106e9` reports all six endpoints `ACTIVE`, Node.js 20, `us-central1`.
- Runtime commits: app `6dcfa975`; Firebase root `0fd0dfe5`.
- Public/private Pages were intentionally not deployed in this phase; final Pages deployment remains gated by the later rollout phase.

## Phase 3 evidence — 2026-07-17

- Focused Vitest suites: 4 files, 16 tests passed.
- App TypeScript: `npx tsc --noEmit` passed.
- Firebase Functions TypeScript: `npm run build` passed.
- Take Offline remains a visibility-only mutation; Trash and Restore are separate audited transitions.
- Permanent deletion requires `DELETE <watchface-id>`, rejects order references, and retains Firestore on unexpected Storage failures.
- Storage maintenance is dry-run only and reports managed bytes plus historical-path orphan candidates.
- All six targeted lifecycle endpoints report `ACTIVE`, Node.js 20, `us-central1`.
- Runtime commits: app `4c350add`; Firebase root `44729339`.

## Phase 4 evidence — 2026-07-17

- Focused Vitest suites: 5 files, 19 tests passed.
- App TypeScript and Firebase Functions TypeScript passed.
- Shared Release Wizard is mounted from both Studio and Admin.
- Server persists Design DNA, Collection, Design Model, embedded Variant/Edition SKU snapshots, Technical Target, revisioned Technical Package, and Offer.
- Server performs normalized hierarchy conflict checks and generates canonical customer names/internal codes.
- Save as Ready creates a READY package; Release to Store creates a VALIDATING release request that cannot become live before Phase 5 parity verification.
- Direct enablement of architecture-managed catalog records requires a CURRENT Technical Package.
- `adminStoreHierarchy` and the updated `adminCatalogStatus` report `ACTIVE`, Node.js 20, `us-central1`.
- Runtime commits: app `d2515a70`; Firebase root `7166a821`.

## Phase 5 evidence — 2026-07-17

- Focused Vitest suites: 3 files, 16 tests passed, including V2/V3 repack and corruption fixtures.
- App TypeScript and Firebase Functions TypeScript passed.
- Naming locations and the strict allowlist are documented in `zpk-name-locations.md`.
- Release downloads the exact approved Workshop ZPK, verifies its recorded SHA-256, and creates a derivative without rerunning generation/rendering.
- Only `appName` and `description` values in outer, device-side, and app-side manifests may differ.
- All other outer/nested entries receive before/after SHA-256 comparison; missing manifests, corrupt ZIP/CRC data, insufficient name replacement, unexpected fields, and existing immutable release paths fail closed.
- Approved and released ZPK paths remain distinct; the stored parity report links both hashes and the approved Workshop Build.
- Successful verification makes the package CURRENT, supersedes an older current package for the same SKU/target, promotes the Workshop Build, and activates the SKU/Offer.
- `adminReleasePackage` reports `ACTIVE`, Node.js 20, `us-central1`.
- Runtime commits: app `3fbbe709`; Firebase root `80935444`.

## Phase 6 evidence — 2026-07-17

- Focused Vitest suites: 2 files, 12 tests passed.
- App TypeScript and Firebase Functions TypeScript passed.
- Feature-flagged public provider exposes one card/page per Design Model with nested SKU Variant/Edition choices.
- Collection, Design Model, and Device compatibility routes are registered; legacy face IDs resolve through mappings and fall back to the legacy product page when unmapped.
- MAIN/AOD selection uses released package media; buttons expose `aria-pressed` and meaningful preview alternative text.
- Offers and device compatibility resolve from the selected SKU, while device targets remain technical information rather than duplicated artistic products.
- Homepage reports Unique Design Models and Sellable SKUs separately and uses finished-timepiece wording.
- `publicStoreHierarchy` and `publicReleaseMedia` report `ACTIVE`, Node.js 20, `us-central1`.
- Live `publicStoreHierarchy` smoke test returned HTTP 200 with the expected response shape. Counts are zero until the first Phase 5 release or Phase 8 migration creates live hierarchy records.
- Runtime commits: app `19e14794`; Firebase root `cd8ad028`.

## Phase 7 evidence — 2026-07-17

- Firebase Functions TypeScript and 5 focused pricing/fulfillment tests passed from the clean deployment snapshot.
- App TypeScript and Vite production build passed; the Offer checkout UI remains behind `VITE_STORE_OFFER_CHECKOUT_ENABLED`.
- Checkout loads the ACTIVE Offer and LIVE included SKUs server-side and records immutable price, Offer, SKU-entitlement, and selected-device snapshots.
- Paid confirmation creates idempotent per-SKU entitlements; zero-price Offers receive the same snapshots and entitlements without a payment round trip.
- Fulfillment maps the selected Device to its Technical Target and requires exactly one CURRENT released package for every entitled SKU.
- BUNDLE Offers return every included SKU package, preserving Complete Color Collection semantics and failing closed for missing or ambiguous current revisions.
- Legacy `createOrderOrCheckout`, `download`, `downloadByToken`, order parsing, and `zpk/<legacy-id>.zpk` resolution remain unchanged.
- Targeted deployment created `createOfferCheckout` and `fulfillEntitlement` and updated `paddleWebhook`; both new endpoints appear in the active Node.js 20 `us-central1` function inventory.
- Live negative smoke tests returned HTTP 400 for missing Offer ID and missing entitlement token, confirming request validation without creating an order.
- Runtime commits: app `43abb0b6`; Firebase root `3523d6fe`.
- Public/private Pages were intentionally not deployed; storefront activation remains feature-flagged and final Pages deployment remains gated by Phase 9.

## Phase 8 implementation evidence — 2026-07-18

- Firebase Functions TypeScript and 9 focused migration/fulfillment tests passed from both the working tree and clean deployment snapshot.
- Storefront compatibility suites passed: 2 files, 13 tests.
- Explicit `build:public` and Firebase-preflighted `build:private` completed successfully.
- Migration planning is deterministic and mechanical: every legacy watchface receives one temporary Design Model, one default SKU, one Technical Package, one compatibility Offer, and one manual-classification queue entry. No artistic grouping is inferred.
- Dry-run inventory reports catalog visibility, orders, tokens, managed Storage bytes, missing ZPKs, unexplained objects, unknown order product IDs, conflicts, and a SHA-256 plan hash without changing catalog records.
- Apply requires the exact saved report, unchanged source-plan hash, single use, typed `BACKFILL <count>` confirmation, and zero missing legacy ZPKs.
- Apply is additive and does not update or delete legacy watchfaces, orders, download tokens, or Storage objects.
- Legacy `/face/:id` and `/buy/:id` resolve through `legacyMappings`; historical `orders.productId`, legacy token status, and legacy download resolution remain unchanged.
- `adminLegacyMigration` was deployed alone to `zeppfaceloader-b0b106e9` and appears in the function inventory as Node.js 20, `us-central1`, 1024 MB.
- Live unauthenticated GET returned HTTP 401 `Missing bearer token`, confirming the migration/report/queue surface is admin-only.
- Runtime commits: app `034f00f0`; Firebase root `84b5bf27`.
- Authenticated production dry-run reported 200 legacy records (1 visible, 199 retained offline), 9 orders, 9 tokens, 573.5 MB managed Storage, 257 unexplained objects, and zero missing ZPK files. Plan hash: `3bbcb243d9e10715f7e03adc691ad03c846fdc858a4f2a698a8440afcf1cd19b`.
- The first apply attempt made no writes because mixed-case Firestore report IDs were incorrectly normalized to lowercase. The endpoint now validates report IDs without changing case; all 9 backend tests passed and `adminLegacyMigration` version 2 deployed successfully on 2026-07-18.
- The fresh saved plan applied successfully: the Admin classification queue contains the temporary one-to-one records in `PENDING` state, including explicit `UNKNOWN_TECHNICAL_TARGET` warnings where source technical identity is unknown.
- The 257 unexplained Storage objects remain untouched. Public cutover flags remain disabled pending investigation of the 9 historical orders, whose `productId` values did not directly match current legacy watchface document IDs (`mappedOrderProductCount: 0`).
