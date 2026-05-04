# Spec 075 Tasks

Execute one at a time. STOP after each for user approval.

## T0 — Add Debug Export panel
- Add a small "🔧 Debug Export" button in `ParametricPage.tsx` (near existing toolbar).
- On click: collect `{ templateJSON, selectedElementId, previewSvgString, userAgent, ts }` and copy to clipboard + show in a textarea modal.
- Read from `window.localStorage['parametric-template-elements-v1']` directly (truth source).
- For previewSvgString: query the rendered preview container by id/class and serialize.
- No engine changes.

## T1 — Fix `mirrorSelectionStroke` (Bug B)
- File: `app/src/ParametricPage.tsx` ~line 4394.
- For each point: convert local→canvas via `elementMaskLocalToCanvasPoint`, mirror in canvas (`100 - x` for H, `100 - y` for V), convert back via `canvasToElementMaskLocalPoint`.
- For rect/circle/oval shape strokes: convert all four corners local→canvas, mirror, convert back, recompute bounding box (min/max of corners).

## T2 — Fix renderer styleAdjust merge order (Bug C)
- File: `app/engine/core/renderer.js` ~line 1486.
- Swap order: `{ ...renderParams.styleAdjust, ...safeElement.styleAdjust }` so element-level (panel) overrides params-baked defaults.
- Audit `effect3d` and `dropShadow` for the same anti-pattern in the same function.

## T3 — Diagnose + fix Bug A (base + brush mask)
- After T0 deployed, user runs the bug reproducer and sends export.
- Read the export, identify the discrepancy (most likely: `coordinateSpace` mismatch on first stroke, or empty primitives still triggering mask emit, or namespace pass collision specific to layer 0 / `base`).
- Apply minimal targeted fix.

## T4 — Build, deploy, live-verify
- Inject env vars from `.env.private.local` into PowerShell session.
- `cd app; npm run build:private; npm run deploy:docs:private`
- Restore `app/index.html` to dev source script.
- Commit-split per master prompt: docs/specs → impl+tests → deploy artifacts → outer pointer bump.
- Verify live URL renders new bundle hash.
