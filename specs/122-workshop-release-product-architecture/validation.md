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

