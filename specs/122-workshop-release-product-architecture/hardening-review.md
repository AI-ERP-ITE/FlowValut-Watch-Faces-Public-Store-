# Spec 122 Post-Audit Hardening Review

**Status:** Private candidate deployed and live-verified  
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

No deployment blocker remains for the approved private candidate. A user-authenticated Studio ZPK → Workshop Build smoke test remains the final hands-on acceptance step.

## Deployment record — 2026-07-18

- Firebase project: `zeppfaceloader-b0b106e9`
- Functions deployment: 52 deployed, 0 errors
- Functions source hash: `8cf208b7abbd6562a0df303d6345d645fa507914`
- Required Workshop endpoints: active in `us-central1`
- Private origin commit: `c5536bade6054207520700012f4e009cfc8ce8f9`
- Private bundle: `index-CBlBrWUl.js`
- Live root, Studio, and Parametric routes: HTTP 200 with identical bundle hash
- Workshop GET and authenticated POST preflights: HTTP 204 with expected CORS methods and headers
- Deployed bundle contains the local-ZPK preservation fallback

Operational follow-up: upgrade the deprecated Node.js 20 runtime and Firebase Functions SDK in a separate compatibility-tested change. The dependency audit also reports known vulnerabilities that should be reviewed separately rather than auto-fixed during this deployment.
