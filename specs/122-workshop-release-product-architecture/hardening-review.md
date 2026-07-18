# Spec 122 Post-Audit Hardening Review

**Status:** Isolated candidate built and validated; not deployed  
**Deployment rule:** Build the eventual candidate from an isolated clean checkout and deploy only after explicit user approval.

## Spec 122-owned changes

- `package.json` private-only feature enablement
- `scripts/requirePrivateFirebaseEnv.mjs` mode-aware preflight
- `src/components/ReleaseWizard.tsx`
- `src/components/storefront/AdminOpsPage.tsx` Workshop lifecycle/release controls and collapsed legacy tools
- `src/lib/releaseWizard.ts` and tests
- `src/lib/storeHierarchyApi.ts`
- `src/lib/workshopApi.ts` and tests
- Narrow `src/StudioApp.tsx` changes only for Workshop identity reset, parent lineage, and removal of premature release controls
- A ZPK-success/Workshop-save-failure boundary so a network/backend outage cannot discard the locally generated test package
- Firebase Workshop lifecycle, hierarchy, release retry, compatibility, and maintenance endpoints/tests

## Separate workstream changes that must not be silently included

- `src/lib/storePreviewCapture.ts`
- `src/lib/storePreviewCapture.test.ts`
- The isolated MAIN/AOD preview-capture hunks currently present in `src/StudioApp.tsx`
- Generated deployment HTML/assets from other private/public deployments

These files are preserved in the shared working tree but are not automatically approved as part of Spec 122. The eventual deployment candidate must select them only if their owning workstream is separately approved.

## Validation evidence

- Isolated candidate: `.deployment-candidates/spec122-20260718-1628`
- Candidate frontend (excluding the separate preview-capture workstream): 21/21 focused tests passing
- Firebase Functions: 16/16 passing
- Functions TypeScript build: passing
- Private production build from the deploy-ready isolated Git clone: passing (`index-DcciY_nv.js`)
- Candidate bundle SHA-256: `5FF4FBDE3F0668F52CE32DDB12594AF8041B805726344FA25A2F6DAC2C12F97B`
- Duplicate Functions exports: none
- Complete frontend suite: 205 passing, the same 11 rendering/effects failures that existed before hardening, plus four legacy test-discovery configuration failures

## Deployment blockers

1. Receive explicit user approval for the isolated candidate.
2. Deploy the candidate Functions before the private UI so Workshop requests cannot target missing endpoints.
3. Verify the live Functions list, CORS behavior, Studio ZPK/Workshop save, Admin project listing, and deployed bundle hash.
