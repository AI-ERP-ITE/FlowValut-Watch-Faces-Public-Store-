# 09 — Progress Log

## 2026-05-10 — Phase 1 complete & deployed

- Inner repo commit: `db50459` on `AI-ERP-ITE/Watch-Faces` `main`.
- Live bundle: `index-B-7dOJyl.js` (HTTP 200 confirmed).
- Live URL: https://ai-erp-ite.github.io/Watch-Faces/studio/parametric/
- Tests: 17/17 new resolver tests passing. No regressions introduced.
- Pre-existing 8 failing tests confirmed unrelated to 085 (originate
  from prior shadow-blur work in `b723f48`).
- Renderer routing intentionally NOT touched (Phase 2).

## NEXT — Phase 2

Awaiting explicit approval before touching `renderer.js`. See `04-tasks.md`
T10–T18 for the planned sequence.

## 2026-05-10 -- Phase 2 wired (T10-T18)

- Inner repo commit: `7f554cf`. `renderer.js` now consults `sourceResolver` for surface + silhouette; drop-shadow / depth / glow filters consume `resolveSilhouetteSource(el)`; baked-alpha intersected with `additionalLiveMaskKey` before shadow chain. Mask preview overlay + ZPK exporter both routed through resolver. Added `sourceResolver-phase2.test.js` + `render-quality-mode.test.js`. 23/23 new tests pass.

## 2026-05-10 -- Phase 2 hotfix H01 (back-compat)

- Inner repo commit: `e4321e1`. Legacy elements without `renderSourceMode` field now default to `procedural` in `sourceResolver.resolve()`.

## 2026-05-11 -- Phase 2 hotfix H02 (preview gate removal)

- Inner repo commit: `7fb6ecd`. Bundle: `index-B7Tr_sDY.js`. Engine chunk: `index-B7SrsiA3.js`. Removed preview-quality shadow disable in `renderLayer` (no React subscriber re-rendered on editing->idle transition). Raised `normalizeDropShadowForBake` opacity clamp 0.35 -> 1.0.

## 2026-05-11 -- Phase 2 hotfix H03 (root-cause: UI envelope caps)

- Inner repo commit: `24540c3` (outer pointer: `0367088`). Bundle: `index-CzY5i5Ax.js`. Engine chunk: `index-KHTY_XTW.js`.
- **Root cause:** `app/engine/ui/shadowProfiles.ts` capped `shadowOpacity.renderMax` at 0.35, `shadowBlur.renderMax` at 8, `shadowSpread.renderMax` at 0.25, `shadowOffset` at +-8. Slider at 99% mapped through gamma curve -> opacity ~0.34 -> barely-visible shadow. Renderer + bake normalization both enforced the same low ceilings as guardrails.
- **Fix:** raised all four caps in `shadowProfiles.ts`, `engine/core/renderer.js` `normalizeDropShadowEffect`, and `src/lib/effectNormalization.ts` `normalizeDropShadowForBake`: opacity -> 1.0, blur -> 20, spread -> 1.0, offset -> +-20. Scaled delta thresholds in `parameterBehavior.test.ts` 2.5x/4x to match wider ranges.
- Tests: 8 pre-existing failures (was 9). 0 new regressions.
- Verified shipped values in compiled bundle: `shadowOpacity{renderMax:1}`, `shadowBlur{renderMax:20}`, `shadowOffset{renderMin:-20,renderMax:20}`, renderer `clamp(...blur,0,20)` / `spread,0,1`.