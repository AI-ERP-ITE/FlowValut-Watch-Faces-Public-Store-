# 20 - T-041 Live Verification

Task: T-041 Live verification on parametric route
Date: 2026-05-07
Status: Blocked

## Objective

Verify live deployment on public URL uses the T-040 bundle hash and confirm issue is not reproducible on parametric route.

## Expected From T-040

1. Expected JS hash: `index-C0jqmnpy.js`
2. Expected CSS hash: `index-CrlChUe_.css`

## Live Checks Executed

1. Route check URLs:
   - `https://ai-erp-ite.github.io/Watch-Faces/`
   - `https://ai-erp-ite.github.io/Watch-Faces/?p=/studio`
   - `https://ai-erp-ite.github.io/Watch-Faces/studio/parametric/`
2. For each route, extracted script and stylesheet hash from returned HTML.
3. Cache-bypass check executed with query param (`?cb=<timestamp>`).
4. Asset existence checks:
   - expected new hash URL
   - currently served old hash URL

## Results

1. All route HTML responses: HTTP 200.
2. All route HTML script hash: `assets/index-JlXHYMHy.js` (old).
3. All route HTML css hash: `assets/index-CrlChUe_.css`.
4. Cache-bypass route still returned old script hash `index-JlXHYMHy.js`.
5. New hash URL returned 404:
   - `https://ai-erp-ite.github.io/Watch-Faces/assets/index-C0jqmnpy.js`
6. Old hash URL returned 200 and content:
   - `https://ai-erp-ite.github.io/Watch-Faces/assets/index-JlXHYMHy.js`

## Interpretation

1. Live site does not yet serve the T-040 deployed bundle hash.
2. T-041 done criteria cannot be satisfied yet because live hash parity failed.
3. Private auth gate appears on checked routes, but this is not the blocker; hash mismatch is blocker.

## Blocker

Deployment propagation/source mismatch on GitHub Pages:
- deployed repo head includes T-040/T-041 evidence commits,
- but public page still serves prior hashed bundle.

## Required Unblock Condition

1. Live root and SPA route must reference `index-C0jqmnpy.js` (or a newer documented deploy hash).
2. Target asset URL must return HTTP 200.
3. Then rerun route verification and behavioral repro check.
