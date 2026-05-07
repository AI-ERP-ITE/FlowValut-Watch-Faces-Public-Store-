# 14 - T-020 Mask Buffer Implementation

## Summary
Implemented direct scalar field updates for mask editing in the editor path.

## Changes
1. Added direct mask field update helpers in ParametricPage.
2. Added per-stroke hide/reveal u8 delta update logic.
3. Added shape/brush raster updates into authoritative field values.
4. Added mask field reset on clear-strokes action.
5. Added field cache serialization:
   - values (u8 array)
   - width/height
   - imageDataUrl cache

## Core Equation in Implementation
Hide:
V_next = max(0, V_prev - round(255 * strength))

Reveal:
V_next = min(255, V_prev + round(255 * strength))

## Files
1. src/ParametricPage.tsx
2. engine/core/renderer.js (field consumption path enabled for next gate)

## Validation
Targeted tests passed:
1. engine/core/render-source-snapshot-mode.test.js
2. engine/snapshot/snapshotRenderer.test.ts
3. src/lib/history/commandHistory.test.ts

## T-020 Done Criteria Check
1. Direct edit operations implemented: PASS.
2. No lerp-based update in editor write path: PASS.
