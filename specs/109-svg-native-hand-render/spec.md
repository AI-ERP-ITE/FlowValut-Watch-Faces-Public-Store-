# Spec 109 — SVG-Native Hand Rendering for Canvas Preview

## Problem
Custom time pointer hands are baked to tiny fixed PNGs (22×140, 16×200, 8×240) for
the canvas preview. These sizes lose all ornate detail. Multiple attempts to fix quality
via higher-res bakes failed because the pivot coordinate spaces kept mismatching.

## Root Cause
The bake pipeline uses cover-fit cropping which changes the art's proportional position
in the output canvas. Any pivot computed in baked-PNG space cannot accurately map back
to SVG-space for a direct-SVG render.

## Solution
For source-backed custom hands, bypass the baked PNG entirely in the canvas preview.
Render the source SVG at natural dimensions × canvas scale directly via ctx.drawImage.
The pivot uses the SVG-space ratio (composerAxis value saved as hourSvgPivotNorm).

## Scale Rule
canvasRef = ctx.canvas.height (Y dimension)
scale = canvasRef / svgNaturalHeight
displayW = svgNaturalW × scale
displayH = svgNaturalH × scale = canvasH
pivotY = svgPivotNorm × displayH

## Rect Watch Handling
For rectangular canvases (390×450 etc.), using height (Y) as canvasRef scales
hands to fill the vertical extent. Sideways clipping at 3/9 o'clock is a non-issue
for well-designed hands (short tips). User can adjust handLengthScale slider to fix
any edge cases.

## ZPK Export
Unchanged. Baked PNGs at 22×140 still go into the ZPK. posX/posY unchanged.
This spec is preview-only.

## Backward Compatibility
Old records without sourceHourHtml → fall back to baked-PNG path (HAND_DEFS).
Old records with sourceHourHtml but no hourSvgPivotNorm → fall back to hourPivotNorm.

## Files Changed
- app/src/lib/customHandStore.ts
- app/src/components/InteractiveCanvas.tsx

## Tasks
T1: Add hourSvgPivotNorm/minuteSvgPivotNorm/secondSvgPivotNorm to CustomHandRecord
T2: Remove hourPreviewDataUrl/minutePreviewDataUrl/secondPreviewDataUrl and preview bake code
T3: loadHandImages: use source SVG data URL for source-backed hands
T4: drawTimePointer: SVG-direct path using natural dims × canvas scale + svgPivotNorm
