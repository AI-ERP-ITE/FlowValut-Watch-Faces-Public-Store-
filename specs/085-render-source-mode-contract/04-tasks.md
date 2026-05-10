# 04 — Tasks

Status legend: ✅ done · ◐ in progress · ☐ not started

## Phase 1 — Contract (no renderer wiring)

| ID | Task | Status | Commit |
|---|---|---|---|
| T01 | Add `RenderSourceMode` enum + `SurfaceSource` / `SilhouetteSource` DTOs (`renderSourceMode.ts`) | ✅ | `db50459` |
| T02 | Extend `ParametricElementRenderState` with `renderSourceMode?` + `maskEmbeddedInSnapshot?` | ✅ | `db50459` |
| T03 | Implement `sourceResolver.ts` (resolve mode / surface / silhouette, never reads geometry history) | ✅ | `db50459` |
| T04 | Implement `renderSourceModeMigration.ts` (one-time legacy stamp, idempotent) | ✅ | `db50459` |
| T05 | Implement `renderSourceModeTransitions.ts` (only sanctioned mutators) | ✅ | `db50459` |
| T06 | Wire migration into `normalizeRenderState`, write canonical fields in `setElementSnapshot` / `deleteElementSnapshot` | ✅ | `db50459` |
| T07 | Stamp `maskEmbeddedInSnapshot` at the two snapshot callsites in `ParametricPage.tsx` (`createSnapshotForSelectedElement` → false, `createBakedLayerFromElement` → true) | ✅ | `db50459` |
| T08 | Add `sourceResolver.test.ts` covering all 3 states, migration, transitions, geometry-ignorance, missing-pixel degradation | ✅ | `db50459` |
| T09 | Build + private deploy + live verification | ✅ | bundle `index-B-7dOJyl.js` |

## Phase 2 — Renderer routing (NOT STARTED — requires explicit approval)

| ID | Task | Status |
|---|---|---|
| T10 | Map every consumer of `renderState.snapshot` / mask body / silhouette in `renderer.js` and replace with `sourceResolver` calls | ☐ |
| T11 | Replace blanket `isPreviewQuality ? disable shadow : enable shadow` with mode-aware policy: shadow stays enabled when surface is `baked-image` (cheap path) | ☐ |
| T12 | Drop-shadow / depth / glow effect filters: feed silhouette alpha from `resolveSilhouetteSource(el)`. For `baked-alpha`, intersect with `additionalLiveMaskKey` mask before the shadow filter | ☐ |
| T13 | Mask preview overlay: read silhouette from resolver so it always matches the rendered shape | ☐ |
| T14 | Export pipeline: ensure ZPK exporter reads silhouette/surface from resolver, no geometry-history reads | ☐ |
| T15 | Tests: regression test that asserts shadow IS rendered for a `baked-live-mask` element in preview quality | ☐ |
| T16 | Tests: regression test that asserts mask edits update silhouette for a `baked-live-mask` element without re-baking | ☐ |
| T17 | Tests: regression test that asserts no procedural geometry is consulted for `baked-baked-mask` even with non-empty `params` | ☐ |
| T18 | Build + private deploy + manual live verification on a `baked + live mask + dropShadow` element | ☐ |


## Phase 2 status update (2026-05-11)

T10-T18 all DONE in commit `7f554cf`. Hotfixes:
- H01 (`e4321e1`): resolver back-compat fallback for legacy elements
- H02 (`7fb6ecd`): remove preview-quality shadow gate + raise opacity clamp
- H03 (`24540c3`): raise UI envelope caps (opacity 0.35->1.0, blur 8->20, spread 0.25->1.0, offset +-8->+-20) -- root-cause fix for "shadow still invisible" after H02