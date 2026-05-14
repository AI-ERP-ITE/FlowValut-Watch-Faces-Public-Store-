# Spec 089 — Implementation Plan

## Touched files

| # | File | Type | Change |
|---|------|------|--------|
| 1 | `app/src/types/imageSwitcher.ts` | edit | Add `sourceHtml?: string`, `sourceHash?: string` to `RangeSlot`. Update doc comments. |
| 2 | `app/src/lib/imageSwitcherSync.ts` | edit | Extend `SlotMeta` with `sourcePath?`, `sourceURL?`, `sourceHash?`. In `pushSwitcherDefinition`: per-slot, if `sourceHtml` present and hash differs from existing → `uploadSourceText()` to `users/{uid}/imageSwitchers/{defId}/slot_{i}.html`. In `pullSwitcherDefinitions`: if `sourceURL` present → `downloadText()` → hydrate `sourceHtml` + `sourceHash`. In `deleteSwitcherFromCloud`: include `slot_{i}.html` paths. |
| 3 | `app/src/components/ImageSwitcherSlotRow.tsx` | edit | Add expandable HTML editor (textarea), iframe live preview, "Bake to PNG" button. On bake → `renderHtmlToDataUrl()` → `sha256Hex(html)` → `onUpdate({ dataUrl, sourceHtml, sourceHash })`. Show "rebake needed" badge when source hash drifted. |
| 4 | `app/src/components/IconLab.tsx` | edit | Gauge Pointer tab: add iframe live preview pane mirroring Icons tab pattern (zoom slider, dark/light bg toggle, debounced 300 ms `useEffect` on `gpHtml`). Place preview to right of editor on lg+ screens. |
| 5 | `ISSUE_LOG.md` | edit | Move #14 + #15 status → 🟡 In Progress, then ✅ Resolved after deploy + verify. |

## No-touch files (verified)

- `app/src/lib/imageSwitcherStore.ts` — IDB layer uses `tx.objectStore(STORE).put(def)` (structured clone). New optional fields propagate without code change.
- `firebase/storage.rules` — already grants `users/{uid}/imageSwitchers/{definitionId}/{rest=**}` owner read/write.
- `firebase/firestore.rules` — already covers `users/{uid}/imageSwitchers/{*}`.
- `app/src/lib/firebaseStorageClient.ts` — `uploadSourceText` / `downloadText` already exist.
- No new Cloud Functions.

## Sequencing

T1 → T2 (T2 depends on T1 type) → T3 + T4 (parallelizable, but execute sequentially per user instruction) → T5 → lint+build → ISSUE_LOG update → deploy private → post-deploy verify.

## Risk register

| Risk | Mitigation |
|------|-----------|
| Bad HTML triggers infinite iframe load | 2 s timeout already in `renderHtmlToDataUrl`; iframe preview also wraps in `try/catch` and `onerror` |
| Concurrent uploads of 29 slots saturating network | `Promise.all` is fine for ≤50 files (already used by hand-set push); no throttle added |
| Forgetting to delete `slot_*.html` on switcher delete | Extend `deleteSwitcherFromCloud` deterministic-paths loop to include both `.png` and `.html` |
| Breaking existing PNG-upload flow | `sourceHtml` is purely additive; PNG upload path unchanged |
| Stale-bake silently misleading user | Show yellow "source changed — rebake" badge when `sha256(sourceHtml) !== sourceHash` on mount |

## Deploy target

Private only. Command: `npm run deploy:full:private` (per `.github/prompts/speckit.master.prompt.md` DEPLOY FAST MAP rule 1). Live URL: `https://ai-erp-ite.github.io/Watch-Faces/`. Image-switcher lab is private-only feature; no public bundle change needed.
