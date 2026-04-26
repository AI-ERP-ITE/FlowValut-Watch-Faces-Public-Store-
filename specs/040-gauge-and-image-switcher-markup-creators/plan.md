# Plan: Gauge + Image Switcher Markup Creators

## Stage-Gated Flow (specsmd-mater)
1. ANALYZE
2. LOCATE
3. CLARIFY
4. PLAN
5. CONFIRM (`approve` or `proceed`)
6. IMPLEMENT
7. BUILD
8. DEPLOY
9. VERIFY

## Sequential Implementation Plan
1. Add markup frame extraction utility for single-source HTML/SVG parsing and frame separation.
2. Add GAUGE_POINTER creator controls in PropertyPanel (textarea + build action).
3. Add IMG_LEVEL batch creator controls in PropertyPanel with parser strategy messaging.
4. Update export path to consume inline IMG_LEVEL frame data URLs and emit deterministic PNG files.
5. Build and verify that existing file-name IMG_LEVEL and gauge flows remain stable.
