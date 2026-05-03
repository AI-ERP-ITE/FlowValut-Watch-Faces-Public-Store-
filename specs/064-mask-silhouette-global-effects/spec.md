# Spec 064: Mask Silhouette Global Effects

## Goal
Make masking behave as true geometry transformation for every element type so all rendering effects are recomputed from the resulting visible silhouette.

## Scope
- All element categories (free objects, primitives, text, icon/image-driven, generated geometry).
- All mask modes (normal, invert) and actions (hide, reveal).
- All effect families must follow the post-mask silhouette.

## Core Rules
1. Mask result is the canonical silhouette for the element in the render pipeline.
2. Hide strokes remove silhouette area; reveal strokes add visible silhouette area only within source geometry bounds.
3. Invert mask semantics are respected globally: hidden/revealed regions swap baseline visibility.
4. Every effect is computed from canonical silhouette, not original pre-mask geometry.
5. New mask-created boundaries behave as true boundaries for edge-driven effects.

## Effect Reapplication Contract
The following must recompute from canonical silhouette:
1. Stroke/edge treatment.
2. Depth effects (inner, outer, front).
3. Drop shadows (inner, outer).
4. Texture overlays and their blur/clip logic.
5. Gradient overlays and their blur/clip logic.
6. Material overlays and blend logic.
7. Final style/tint/filter compositing.

## Renderer Architecture Direction
1. Build canonical alpha/silhouette after mask resolution.
2. Route all filter primitives to canonical alpha instead of raw source alpha.
3. Build edge band from canonical alpha for boundary effects.
4. Clip overlay masks and final composite using canonical alpha.
5. Keep implementation element-agnostic (no per-type special casing).

## Acceptance Matrix
1. Rect + hide half: new cut edge shows stroke/depth/shadow.
2. Rect + invert+reveal island: island boundary gets full effects.
3. Non-free element (text or icon): same boundary behavior under mask edits.
4. Texture/gradient/material overlays stop and blend exactly at canonical boundary.
5. No stale pre-mask edge artifacts remain.

## Validation
1. Typecheck passes.
2. Private build passes.
3. Deploy sync updates docs and studio entrypoints with matching hash.
4. Manual visual checks across acceptance matrix pass.
