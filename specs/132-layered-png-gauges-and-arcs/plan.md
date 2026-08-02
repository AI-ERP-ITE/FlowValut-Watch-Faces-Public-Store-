# Spec 132 Implementation Plan

## Architecture Decision

Extend existing element and export pipelines. Do not introduce a new watch-side
mask widget and do not modify the SVG gauge detector/renderer.

## Files Expected to Change

| File | Purpose |
|---|---|
| `src/types/index.ts` | Optional PNG gauge/arc fields |
| `src/lib/pngArcFrameGenerator.ts` | Pure angular reveal frame generation |
| `src/components/PropertyPanel.tsx` | PNG upload controls and scoped builders |
| `src/components/InteractiveCanvas.tsx` | PNG Arc preview parity |
| `src/StudioApp.tsx` | Bake/package PNG Arc and layered gauge assets |
| `src/lib/jsCodeGenerator.ts` | Emit PNG Arc image progress while preserving native Arc |
| focused `*.test.ts` files | Geometry, layer order, legacy and package contracts |

## Delivery Phases

1. Data contracts and pure PNG Arc frame generator.
2. Layered PNG Gauge Set UI and grouped-layer creation.
3. PNG Arc UI, canvas preview, assets, and runtime generation.
4. Regression suite, package inspection, private build.
5. Separate implementation commit and atomic private deployment.

## Rollback

All behavior is gated by optional fields. Reverting the implementation commit
restores the prior application without FVWF migration. Native Arc and markup
gauge data remain valid throughout.

