# Spec 030 - Implementation Plan

## Overview
Build a dedicated Pointer HTML Composer workflow that replaces fragile single-input splitting with explicit per-layer authoring and deterministic composition.

## Architecture Changes
1. UI layer
   - Add Pointer Composer section (new component) with 4 editors and pivot controls.
2. State layer
   - Extend hand composition model to store hour/minute/second/hub source snippets and pivot offsets.
3. Rendering layer
   - Render each source independently to PNG, then compose preview with fixed center and hand rotations.
4. Storage layer
   - Save composed presets in custom hand store with backward-compatible schema upgrade.
5. Export layer
   - Export TIME_POINTER assets from separated layers and mapped pivots.

## Data Model (Proposed)
Add a new optional payload for custom hand records:
- sourceHourHtml: string
- sourceMinuteHtml: string
- sourceSecondHtml: string
- sourceHubHtml: string
- pivotOffsets:
  - hour: { x: number, y: number }
  - minute: { x: number, y: number }
  - second: { x: number, y: number }

Backward compatibility:
- Existing records without these fields continue to work.

## Rendering Strategy
1. Parse each editor independently.
2. Convert to image layer using existing HTML/SVG render utilities.
3. For preview composition:
   - Draw hub centered.
   - Draw hour/minute/second using independent transforms and pivot offsets.
4. Reuse same transform math for export to prevent preview/device drift.

## UX Details
1. Default angles at composer open:
   - hour = 60 deg
   - minute = 300 deg
   - second = 0 deg
2. Per-layer validation banners:
   - invalid markup
   - empty layer
3. Pivot controls:
   - numeric X/Y
   - fine step and reset button
4. Optional visual aids:
   - center crosshair
   - anchor dot per hand

## Files Expected To Change
1. src/components/IconLab.tsx (or new composer child component)
2. src/components/PropertyPanel.tsx (surface new preset metadata if needed)
3. src/lib/customHandStore.ts
4. src/StudioApp.tsx
5. src/types/index.ts
6. Optional new component: src/components/PointerHtmlComposer.tsx

## Test Plan
1. Unit-ish behavior checks
   - each layer renders independently
   - invalid minute code does not corrupt hour/second/hub
2. Integration checks
   - save preset -> reload -> same preview
   - select preset -> TIME_POINTER pivots auto-applied
3. Export checks
   - generated ZPK contains distinct hour/minute/second/cover files
   - no duplicated hub in hour/minute/second images
4. Regression checks
   - legacy single-code custom hand styles still load

## Rollout Strategy
1. Deliver behind non-breaking UI insertion in existing flow.
2. Keep legacy mode available until composer path proves stable.
3. Migrate records lazily on save rather than hard migration.

## Execution Protocol Requested by User
1. After second confirmation, execute tasks one by one.
2. Stop after each task for user recheck/approval.
3. Do not batch the full implementation in one pass.
