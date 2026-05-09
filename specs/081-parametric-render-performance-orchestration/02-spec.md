# 02 - Specification

## Objective
Implement strict render-performance optimizations for the parametric SVG watchface editor by changing render orchestration, scheduling, and reuse only.

## Stage 1 - Edit Mode vs Final Mode

### Required Types And State
1. Add global interaction state:
   - `type RenderInteractionMode = "idle" | "editing"`
2. Add central state value:
   - `renderInteractionMode`
3. Add render quality selector:
   - `renderQualityMode = "preview" | "final"`

### Mode Transitions
1. Enter `editing` on:
   - pointerdown
   - slider drag start
   - brush start
   - transform drag start
   - resize drag start
2. Return to `idle` on:
   - pointerup
   - mouseup
   - drag end
   - interaction end
3. Apply `100ms` debounce on transition back to `idle` to prevent thrash.

### Edit Mode Behavior
1. During `renderInteractionMode === "editing"`, allow:
   - transforms
   - movement
   - opacity
   - basic compositing
2. During edit preview, temporarily skip or simplify only expensive passes:
   - blur chains
   - deep shadows
   - multi-pass depth
   - high-cost overlays
   - expensive filter stacks
3. No mutation of element settings. This is preview-only behavior.

### Final Mode Behavior
1. When interaction finishes, run exactly one full-quality render.
2. Final output must be exact and visually correct.

### Required New File
1. `app/engine/rendering/renderInteractionState.ts`
   - interaction mode state
   - setters
   - debounce helpers

### Expected Touch Points
1. Parametric interaction handlers.
2. Render scheduling entry points.
3. Existing renderer quality branch points only.

## Stage 2 - Element Render Cache By State Hash

### Required New File
1. `app/engine/rendering/renderHash.ts`
   - `generateElementRenderHash(element)`

### Hash Include Rules
Hash must include only visual determinants:
1. geometry
2. transforms
3. masks
4. snapshot source hash
5. texture settings
6. effect settings
7. overlay settings
8. opacity
9. visibility

### Hash Exclude Rules
Hash must not include editor-only determinants:
1. selection state
2. hover state
3. editor UI state
4. viewport pan
5. viewport zoom

### Required New File
1. `app/engine/rendering/renderCache.ts`
2. Implement:
   - `type CachedRenderEntry = { hash: string; renderedOutput: string; createdAt: number }`
3. Cache key:
   - `elementId`

### Cache Decision Rule
1. Compute `nextHash = generateElementRenderHash(element)`.
2. If `cached.hash === nextHash`, reuse `cached.renderedOutput`.
3. If different, rerender and replace cache entry.

### Invalidation Rules
Invalidate cache only when:
1. hash changed
2. element deleted
3. snapshot replaced

### Forbidden Cache Behavior
1. No global cache wipe every frame.
2. No unnecessary cache rebuilds.
3. No caching of mutable editor state.

## Stage 3 - Freeze Untouched Layers

### Required New File
1. `app/engine/rendering/renderInvalidation.ts`
2. Implement:
   - `type DirtyReason = "geometry" | "mask" | "effects" | "transform" | "snapshot"`
   - `dirtyElements: Set<string>`

### Dirty Tracking Rules
1. Transform change invalidates target element only.
2. Mask change invalidates target element only.
3. Effect change invalidates target element only.
4. Snapshot replacement invalidates target element only.

### Global Invalidation Exceptions
Allow full-scene invalidation only for:
1. global lighting changes
2. canvas dimension changes
3. theme or global renderer setting changes

### Render Loop Requirement
Replace all-elements-per-frame behavior with:
1. rerender dirty elements only
2. reuse cached frozen output for untouched layers
3. preserve visual layer order

## Validation And Logging Requirements

### Required Tests
1. Edit mode test: preview quality active while dragging, one final render on release.
2. Cache reuse test: unchanged element reuses cache, hash change rerenders once.
3. Sibling freeze test: editing one layer does not rerender siblings.
4. Mask edit test: masking one layer rerenders target only.
5. Large scene test: responsiveness improvement in 20+ layer scene.

### Required Debug Logs
1. `console.debug("[RenderCache]", elementId, "HIT")`
2. `console.debug("[RenderCache]", elementId, "MISS")`
3. `console.debug("[RenderInvalidation]", dirtyElementIds)`

## Commit Plan (Required Names)
1. `feat: add interaction-aware preview render mode`
2. `feat: add element render cache by state hash`
3. `feat: add selective layer invalidation and freezing`
4. `test: add render performance validation coverage`
