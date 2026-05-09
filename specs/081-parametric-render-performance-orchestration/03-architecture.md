# 03 - Architecture

## Design Intent
This design is additive and non-invasive. Existing renderer internals remain authoritative for visual math. New modules coordinate scheduling, cache decisions, and invalidation scope.

## New Modules

### A. Interaction State Coordinator
File: `app/engine/rendering/renderInteractionState.ts`
Responsibilities:
1. Hold `renderInteractionMode` as `idle` or `editing`.
2. Expose start/end interaction APIs.
3. Debounce transition from `editing` to `idle` by 100ms.
4. Expose derived `renderQualityMode` as `preview` or `final`.

Expected API shape:
1. `beginRenderInteraction(source: string): void`
2. `endRenderInteraction(source: string): void`
3. `getRenderInteractionMode(): RenderInteractionMode`
4. `getRenderQualityMode(): "preview" | "final"`
5. `subscribeRenderInteractionMode(listener): unsubscribe`

### B. Deterministic Render Hash
File: `app/engine/rendering/renderHash.ts`
Responsibilities:
1. Build stable, deterministic hash from visual-only element state.
2. Exclude editor/view state by contract.
3. Keep key order stable to prevent false misses.

Expected API shape:
1. `generateElementRenderHash(element: Record<string, unknown>): string`

### C. Element Render Cache
File: `app/engine/rendering/renderCache.ts`
Responsibilities:
1. Store `CachedRenderEntry` per `elementId`.
2. Resolve cache hit/miss from `nextHash`.
3. Return cached `renderedOutput` for hits.
4. Update cache on misses.
5. Invalidate single entries by element id.

Expected API shape:
1. `getCachedRender(elementId: string): CachedRenderEntry | undefined`
2. `setCachedRender(elementId: string, entry: CachedRenderEntry): void`
3. `invalidateCachedRender(elementId: string): void`
4. `removeCachedRender(elementId: string): void`
5. `clearCachedRenderAll(): void` (used only for explicit global invalidations)

### D. Selective Invalidation Tracker
File: `app/engine/rendering/renderInvalidation.ts`
Responsibilities:
1. Track dirty elements using `Set<string>`.
2. Tag dirty reason for diagnostics.
3. Produce dirty list for render scheduling.
4. Support scoped and global invalidation paths.

Expected API shape:
1. `markElementDirty(elementId: string, reason: DirtyReason): void`
2. `isElementDirty(elementId: string): boolean`
3. `consumeDirtyElementIds(): string[]`
4. `markAllElementsDirty(reason: "global"): void`

## Render Orchestration Flow

### Edit Interaction Path
1. Interaction begins -> mode set to `editing`.
2. Scheduler requests preview render quality.
3. For each element:
   - evaluate hash
   - reuse cache on hit
   - rerender only dirty or hash-miss elements
4. Compose final scene from mixed reused and rerendered layer outputs.

### Interaction End Path
1. Interaction ends -> debounced transition to `idle`.
2. Scheduler requests exactly one final-quality render pass.
3. Final pass updates cache entries for involved elements.
4. Scene returns to fully authoritative output.

## Integration Boundaries
1. Do not alter parametric model contracts.
2. Do not alter mask generation algorithms.
3. Do not alter effect calculations.
4. Do not alter snapshot storage model.
5. Only add scheduling and reuse decisions around existing render calls.

## Observability
1. Cache hit/miss logs at element granularity.
2. Dirty element list logs per scheduled render.
3. Optional counters for profiling:
   - elementsRerendered
   - elementsReused
   - fullSceneInvalidations

## Architectural Impact Summary
1. Adds isolated orchestration modules under `app/engine/rendering/`.
2. Preserves existing renderer internals.
3. Converts rerender policy from global-per-frame to selective-per-dirty-element.
