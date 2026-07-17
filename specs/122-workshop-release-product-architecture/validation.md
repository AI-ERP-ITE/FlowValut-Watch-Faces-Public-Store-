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
