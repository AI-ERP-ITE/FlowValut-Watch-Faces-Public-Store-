# 21 - T-041 Retry After Multi-Clip Hotfix

Task: T-041 Live verification on parametric route
Date: 2026-05-07
Status: Blocked

## Objective

Deploy multi-clip alpha hotfix and verify live route hash parity before behavioral confirmation.

## Hotfix Summary

1. Renderer overlay clip masks now use resolved mask frame metrics (`resolvedMaskFrame`) for:
   - texture overlay masks
   - gradient overlay masks
   - material overlay masks
2. New regression test added for stale snapshot fallback with multi-clip overlays.

## Validation

Command:
`npx vitest run engine/core/render-source-snapshot-mode.test.js engine/snapshot/snapshotStorage.test.ts src/lib/history/commandHistory.test.ts`

Result:
1. 3 files passed
2. 19 tests passed

## Commit Chain

1. Implementation commit: `472b4b3` - Fix multi-clip overlay mask frame alignment
2. Deploy commit: `7b222df` - Deploy private bundle for multi-clip alpha fix

## Deploy Output Evidence

1. Deploy command succeeded: `npm run deploy:docs:private`
2. Reported JS hash parity: `index-BrvlPMpO.js`

## Live Verification Attempt

Checked URLs (cache-bypass):
1. `https://ai-erp-ite.github.io/Watch-Faces/?cb=<ts>`
2. `https://ai-erp-ite.github.io/Watch-Faces/?p=/studio&cb=<ts>`
3. `https://ai-erp-ite.github.io/Watch-Faces/studio/parametric/?cb=<ts>`

Observed at check time:
1. All routes returned 200
2. All routes still referenced JS hash `index-C0jqmnpy.js`
3. New assets returned 404:
   - `/Watch-Faces/assets/index-BrvlPMpO.js`
   - `/Watch-Faces/assets/index-BleU8_H5.js`
4. CSS hash `/Watch-Faces/assets/index-CrlChUe_.css` returned 200

## Conclusion

1. Repo deploy artifacts and commits are complete.
2. Public live bundle has not switched to the new hash yet.
3. T-041 remains Blocked pending live hash propagation/publish update.

## Unblock Condition

1. Live routes must reference `index-BrvlPMpO.js` (or newer documented deploy hash).
2. New JS asset must return HTTP 200.
3. Re-run behavioral repro check for alpha disappearance on parametric route.
