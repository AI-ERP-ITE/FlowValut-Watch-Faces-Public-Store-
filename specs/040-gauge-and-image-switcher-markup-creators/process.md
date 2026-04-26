# Process: Gauge + Image Switcher Markup Creators

## Objective
Introduce creator-grade markup ingestion for GAUGE_POINTER and IMG_LEVEL while preserving deterministic export behavior.

## Process Rules
- Follow stage order from specsmd-mater.
- Use approval-gated execution (`approve` or `proceed`).
- Implement sequentially and preserve backwards compatibility.

## Parsing Rules
1. Multi-`<svg>` input yields one frame per SVG block.
2. Single SVG with frame markers yields one frame per marker node.
3. If no markers are found, parser returns one frame and a warning.

## Export Rules
1. Inline IMG_LEVEL data URLs are converted into deterministic PNG file names.
2. Filename-based IMG_LEVEL flows continue to work unchanged.
3. Strict mode behavior remains enforced for expected frame counts.
