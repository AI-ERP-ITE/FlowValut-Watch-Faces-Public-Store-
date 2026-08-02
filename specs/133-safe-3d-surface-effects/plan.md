# Spec 133 Implementation Plan

**Current state:** Planning only. Do not execute tasks without later approval.

## Architecture

1. Define optional persisted settings and pure normalization/clamping.
2. Implement a shared alpha-height-field renderer with explicit padding metadata.
3. Add golden-image tests before connecting any widget.
4. Connect preview and export through the same adapter.
5. Roll out by risk tier: static raster assets, frame/glyph families, pointers,
   composite gauges/arcs, then optional backgrounds.
6. Inspect representative ZPKs and validate physical-watch output before deploy.

## Rollout Order

| Phase | Scope | Risk |
|---|---|---:|
| A | Model, normalization, renderer, safety tests | High |
| B | Static IMG and IMG_STATUS | Medium |
| C | IMG_LEVEL and generated glyph families | High |
| D | TIME_POINTER and GAUGE_POINTER with pivots | Critical |
| E | Layered PNG gauges, PNG Arcs, rasterized shapes | High |
| F | Optional backgrounds and presets polish | Medium |
| G | ZPK inspection, watch QA, private deployment | Critical |

## Verification Strategy

- Golden RGBA fixtures for transparent and anti-aliased edges.
- Disabled-path byte equivalence.
- Raised/recessed and all preset determinism.
- Rectangular and minimum-size assets.
- Family consistency for digits, labels, and switcher frames.
- Pivot invariance before/after padding.
- Canvas/export pixel comparison.
- Package inspection proving only ordinary PNG assets are emitted.
- Physical-watch verification for pale fringe, clipping, and flicker.

