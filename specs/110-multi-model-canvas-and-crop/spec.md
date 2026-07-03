# Spec 110 — Multi-Model Canvas, Crop, and Shape Support

## Problem
The studio canvas, background crop tool, and photo editor are hardcoded to 480×480.
Switching to other watch models (466×466 round, 390×450 rect, 454×454 round, etc.)
produces wrong canvas dimensions, wrong background crop output, wrong drag/resize clamping,
and potentially wrong V2/V3 generator routing.

## Data Source (already in repo — no new files needed)
- `app/models.json`: model key → `{ specGroup, name, ... }`
- `app/specGroups.json`: specGroup key → `{ resolution, shape, cornerRadius, supportedConfigVersions }`
- Both are already loaded as state in StudioApp: `specGroups` and `watchModels`

## Architecture Decision
- Single source of truth: `specGroups[watchModels[watchModel].specGroup]`
- Derive `{ canvasW, canvasH, shape, cornerRadius }` from there
- shape: `'round'` | `'square'` — explicit from specGroups, never inferred from dimensions
- cornerRadius: per-specGroup (e.g. 86 for 390×450, 69 for 320×380, 0 for round)
- Pass `canvasW`, `canvasH`, `shape`, `cornerRadius` as props to all dependent components

## Tasks

### T1 — Derive canvas geometry from specGroups in StudioApp
- Read `specGroups[watchModels[watchModel]?.specGroup]` to get `{ resolution, shape, cornerRadius }`
- Parse `resolution` string (e.g. "480x480") into `{ canvasW: number; canvasH: number }`
- Expose as computed values: `activeCanvasW`, `activeCanvasH`, `activeShape`, `activeCornerRadius`
- These replace the hardcoded resolution lookup in `getDefaultElements`
- Stop: wait for approval before T2

### T2 — Make InteractiveCanvas accept and use canvas dimensions
- Add props: `canvasW?: number`, `canvasH?: number`
- Replace `CANVAS_SIZE = 480` with `const cs = { w: canvasW ?? 480, h: canvasH ?? 480 }`
- Replace `CX = 240`, `CY = 240` with `cx = cs.w / 2`, `cy = cs.h / 2`
- Update drag clamping, resize clamping, all coordinate math to use `cs.w/h`
- Stop: wait for approval before T3

### T3 — Make BackgroundCropTool accept dimensions and shape
- Add props: `width: number`, `height: number`, `shape: 'round' | 'square'`, `cornerRadius: number`
- Replace `const SIZE = 480` with props
- For `shape === 'round'`: keep circular clip (existing behavior)
- For `shape === 'square'`: use rounded-rect clip with `cornerRadius`
- Stop: wait for approval before T4

### T4 — Make BackgroundPhotoEditor accept dimensions
- Add `width: number`, `height: number` props, replace `SIZE = 480`
- Stop: wait for approval before T5

### T5 — Pass all new props from StudioApp to components
- Pass `canvasW/canvasH` to `<InteractiveCanvas>`
- Pass `width/height/shape/cornerRadius` to `<BackgroundCropTool>` when opened
- Pass `width/height` to `<BackgroundPhotoEditor>`
- Stop: wait for approval before T6

### T6 — Fix V2/V3 generator routing to use specGroups
- Current routing uses hardcoded model name lists (fragile, wrong for some models)
- New routing: read `specGroups[specGroup].supportedConfigVersions`
- Prefer V3 when `supportedConfigVersions` includes `'v3'`; fall back to V2
- This makes routing automatic as new models/specGroups are added
- Stop: wait for approval before deploy

### T7 — Deploy and verify
- Build, deploy private, verify live bundle

## Backward Compatibility
- All new props are optional with 480 fallback so existing saved projects load correctly
- V2/V3 routing change uses specGroups data which is the repo's canonical source

## Files Changed
- `app/src/StudioApp.tsx`
- `app/src/components/InteractiveCanvas.tsx`
- `app/src/components/BackgroundCropTool.tsx`
- `app/src/components/BackgroundPhotoEditor.tsx`
- `app/src/lib/jsCodeGenerator.ts`
