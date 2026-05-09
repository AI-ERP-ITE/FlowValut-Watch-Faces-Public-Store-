# 080 — Snapshot Render Source Modes

## Purpose

This spec introduces strict mode-based snapshot replay behavior for the parametric SVG watchface renderer.

The implementation target is to fix snapshot replay correctness without redesigning renderer architecture and without breaking legacy projects.

## Why this spec exists

Recent snapshot workflows need both:

1. Legacy optimization snapshots from spec 076 (fully baked frozen render).
2. New editable baked surfaces from specs 077-079 (post-bake edits still allowed).

Current regressions include:

1. Replay placement drift caused by incorrect centering math.
2. Snapshot effects appearing dead/invisible.
3. Effect alpha keyed to rectangular image bounds instead of true silhouette alpha.
4. Soft snapshot output on HiDPI displays due to logical-size-only raster capture.

## Backward compatibility contract

Spec 076 behavior is preserved exactly through explicit mode selection.

Legacy projects that depended on frozen snapshots must continue to render as frozen snapshots:

- no post-effects
- no depth/dropShadow reapplication
- no texture/material overlay reapplication
- masks/transforms/opacity still apply at layer level

This behavior is not removed or globally changed.

## New mode architecture

Snapshot replay now has two explicit modes:

1. frozen
2. editable

Mode selection is part of per-element render state and controls only snapshot replay behavior.

No renderer redesign is allowed. Existing render pipeline is reused and gated.

See [01-render-source-modes.md](./01-render-source-modes.md).

## Placement correction math

Snapshot capture already encodes world-space appearance into the image. Replay must place that image in template coordinates, not center it again around the element transform origin.

Current centering (`x = -snapshot.width / 2`, `y = -snapshot.height / 2`) is mathematically incorrect for off-center elements.

Correct replay uses template-size image bounds and canceling offsets (`x = -worldX`, `y = -worldY`) under existing outer translate.

See [02-placement-math.md](./02-placement-math.md).

## Silhouette alpha issue

When snapshot replay uses a rectangular `<image>`, SourceAlpha can behave as rectangular bounds for downstream effect operations. This makes depth/dropShadow/overlay clipping appear dead or visually no-op.

For editable mode, effect alpha must be derived from the snapshot image alpha itself using filter primitives (`feImage` + `feColorMatrix`) and propagated as `silhouetteAlpha` where required.

See [03-silhouette-alpha.md](./03-silhouette-alpha.md).

## HiDPI capture correction

Logical-size-only capture (for example 480x480) appears soft on HiDPI canvases.

Capture must support DPR scaling with cap at 2x to balance visual fidelity and storage quota risk.

Logical width/height remain canonical metadata.

See [04-hidpi-capture.md](./04-hidpi-capture.md).

## Non-goals

This spec does not redesign:

- mask system
- effect system
- UV logic
- transform system
- overlay architecture

This spec only introduces:

- snapshot replay correction
- snapshot mode separation
- silhouette alpha extraction for editable snapshot effects
- HiDPI capture correction
- dead code cleanup of preserveRenderSourceMode if unused
