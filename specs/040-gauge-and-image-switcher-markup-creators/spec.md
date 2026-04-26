# Feature Specification: Gauge + Image Switcher Markup Creators

**Feature Branch**: `[040-gauge-and-image-switcher-markup-creators]`  
**Created**: 2026-04-26  
**Status**: Draft

## Problem Statement
Gauge pointer and IMG_LEVEL workflows lacked a direct creator path that accepts one HTML/SVG source and converts it into usable runtime/export assets. The image switcher flow also lacked automatic frame splitting from one source document.

## Goal
1. Add gauge pointer SVG/HTML creator in PropertyPanel.
2. Add IMG_LEVEL batch parser that identifies and separates frames from one HTML/SVG input.
3. Keep export stable by converting inline frame data into deterministic PNG assets.

## Functional Requirements
1. The system MUST accept SVG or HTML markup for GAUGE_POINTER and render it into PNG source data.
2. The system MUST parse one IMG_LEVEL markup input and split multiple frames when markers are present.
3. The system MUST support frame marker patterns (`data-frame-index`, `data-index`, `id=frame-*`, `id=imglvl-*`) and multi-`<svg>` sources.
4. The system MUST keep non-weather IMG_LEVEL export behavior deterministic by materializing stable file names.
5. Existing non-inline filename-based IMG_LEVEL workflows MUST remain backward compatible.

## Acceptance Criteria
1. Pasting one gauge SVG/HTML and clicking build updates pointer source preview/export.
2. Pasting one IMG_LEVEL source with multiple frame markers yields multiple parsed frames.
3. Export writes PNG files for inline IMG_LEVEL frame data and maps `image_array` correctly.
4. Existing filename-based IMG_LEVEL elements continue exporting without regressions.
