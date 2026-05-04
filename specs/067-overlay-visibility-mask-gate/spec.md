# Spec 067 - Overlay Visibility Mask Gate

## Summary
Apply a renderer-native, minimal-risk patch so texture, gradient, and material overlays respect the active element mask visibility while preserving existing UV and gradient behavior.

## Scope
- File in scope: `app/engine/core/renderer.js`
- Reuse existing per-element mask ID and activity state.
- Do not change geometry generation, UV mapping, gradient centers, texture transforms, or controller architecture.

## Problem
Effects already follow masked silhouette, but overlays are composed after filtered body and can visibly bypass masked cut areas.

## Requirements
1. Keep overlay generation unchanged (texture/gradient/material math and transforms untouched).
2. Reuse existing element mask (`elementMaskId`) only when active (`elementMaskDef.active === true`).
3. Wrap combined overlays with one visibility gate:
   - `<g mask="url(#elementMaskId)">...overlays...</g>`
4. Keep no-mask behavior identical to current output.

## Non-Goals
- No clipPath migration.
- No new mask definitions.
- No effect routing refactor.
- No coordinate system changes.

## Validation
1. Masked-out regions do not show texture/gradient/material overlays.
2. UV orientation and gradient centers remain unchanged.
3. Shadow/depth/global light still respond to masked silhouette edges.
4. No-mask layers render exactly as before.
5. Build passes and deploy artifacts sync successfully.
