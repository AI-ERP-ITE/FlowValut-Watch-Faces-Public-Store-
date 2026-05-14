# Spec 089 — Tests & Verification

## Static gates (T6)

- [ ] `cd app && npm run lint` — no new warnings/errors in touched files.
- [ ] `cd app && npm run build` — TypeScript compiles, Vite bundles, no chunk-size regression > 50 KB on `index-*.js`.

## Manual verification (T9 — after deploy)

### A. Image Switcher slot HTML roundtrip
1. Sign in private site → Studio → Lab → Image Switcher.
2. Create new "Battery" switcher (5 slots).
3. On slot 0: paste an SVG (e.g. `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="red"/></svg>`).
4. Verify iframe preview shows red circle within 300 ms.
5. Click "Bake to PNG". Verify thumbnail appears in slot row.
6. Save switcher.
7. Open browser DevTools → Application → Storage → Firestore → `users/{uid}/imageSwitchers/{defId}` — confirm slot[0] meta has `sourcePath`, `sourceURL`, `sourceHash`, `bakedPath`, `bakedDownloadURL`, `bakedHash`.
8. Open Storage tab → confirm both `slot_0.html` and `slot_0.png` exist at expected path.
9. Hard refresh (Ctrl+F5). Reopen the same switcher. Verify HTML reappears in editor + thumbnail intact.
10. Sign out / sign back in (or open in incognito with same account). Verify same.

### B. Compatibility — PNG-only slot path
1. Same switcher, slot 1: click "Upload" → pick a PNG file. Confirm thumbnail. Save.
2. Verify Firestore slot[1] meta has `bakedPath`/`bakedDownloadURL`/`bakedHash` but NO `sourcePath`/`sourceURL`. No regression.

### C. Stale-bake indicator
1. Edit slot 0's HTML (change fill="red" to fill="blue"). Do NOT click Bake.
2. Verify yellow "source changed — rebake" badge appears next to the slot thumbnail.
3. Click Bake. Badge clears.

### D. Bulk-pack capacity (smoke)
1. Create new "Weather" switcher (auto-spawns 29 fixed-code slots).
2. Paste a small SVG (~2 KB) into 5 of the 29 slots. Bake each.
3. Save. Confirm Firestore doc size is well under 1 MiB (DevTools → Network → switcher doc PUT < 50 KB payload).
4. Hard refresh, reload switcher, confirm all 5 baked + sourced slots roundtripped.

### E. Gauge Pointer live preview (Issue #14)
1. Studio → Lab → Gauge Pointers tab.
2. Paste an SVG into the editor. Verify iframe preview pane appears to the right (or below on small screens).
3. Type/edit HTML. Verify preview updates within ~300 ms.
4. Toggle dark/light bg button. Verify background changes.
5. Drag zoom slider. Verify preview scales.
6. Click "Save Gauge Pointer". Verify saves correctly (no regression in existing save path).

## Deploy verification gates (T9)

```powershell
# 1. confirm origin/main got the new commit
git -C app log origin/main --oneline -2

# 2. confirm GH Pages serves new bundle
$resp = Invoke-WebRequest "https://ai-erp-ite.github.io/Watch-Faces/" -UseBasicParsing
$resp.StatusCode  # expect 200
($resp.Content -match 'index-[A-Za-z0-9_-]+\.js') | Out-Null
$Matches[0]      # capture new hash

# 3. confirm new bundle is reachable
Invoke-WebRequest "https://ai-erp-ite.github.io/Watch-Faces/assets/$($Matches[0])" -Method Head -UseBasicParsing | Select-Object StatusCode

# 4. confirm SPA redirect resolves /studio/lab
Invoke-WebRequest "https://ai-erp-ite.github.io/Watch-Faces/?p=/studio/lab" -UseBasicParsing | Select-Object StatusCode
```

## Rollback plan

If post-deploy smoke fails: `git -C app revert HEAD --no-edit && npm run deploy:full:private`. IDB and Firestore data remain forward-compat (new fields are optional); no schema migration needed for rollback.
