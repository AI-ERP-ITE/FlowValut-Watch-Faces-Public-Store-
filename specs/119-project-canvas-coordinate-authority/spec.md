# Spec 119 — Project Canvas Coordinate Authority and Position-Only Rearrangement

**Feature branch:** `main`  
**Created:** 2026-07-16  
**Status:** Draft — awaiting implementation approval  
**Domain:** ZEP P system task / shared Studio core  
**Deployment target after approval:** Private Pages only (`origin/main`)

## Problem

The Studio currently has more than one effective canvas-resolution authority. The interactive canvas can derive its dimensions from the selected Firebase model/spec group, while project editing and export also read the saved `config.resolution`. Several editor and generator paths additionally retain fixed `480` bounds or `(240,240)` defaults. This can make a project authored for a non-480 model appear correct in one surface but shift on the physical watch.

Most rendering and export behavior is already correct and must not be rewritten. The existing HTML workflow is relative and deliberately lets the user bake, resize, and reposition its output. It is outside this change. Time pointers, gauge pointers, icons, level frames, switchers, and other custom assets must not be resized merely because the project canvas resolution changes.

## Canonical authority contract

1. Before project creation, the selected Firebase model/spec-group metadata supplies the new project's resolution, shape, compatibility metadata, device sources, and supported configuration versions.
2. At project creation, that resolution is stored in the existing `WatchFaceConfig.resolution` field.
3. After a project exists or an FVWF is loaded, its saved `config.resolution` is the sole coordinate-space authority for Studio preview, property validation, asset placement, and export.
4. Firebase model/spec-group data continues to control model identity, compatibility, and generator-version capability. This spec does not change Firebase data or backend behavior.
5. Artwork dimensions and asset-local geometry remain controlled by their existing renderers.

## Functional requirements

### FR-1 — One project coordinate system

- Interactive Canvas, Property Panel, ordinary element creation, MAIN/AOD editing, background preparation, and V2/V3 export must read the same saved project resolution once a project exists.
- The pre-project model resolution may initialize a new config but must not override an already loaded project resolution.
- Existing `config.resolution` remains the persistence contract; no redundant canvas schema is added unless implementation proves it unavoidable.

### FR-2 — Project-aware editor coordinates

- Replace generic `0..480` X/Y/W/H editor clamps with the active project width and height.
- Replace generic canvas-center assumptions with `projectWidth / 2` and `projectHeight / 2` only in widget paths that currently depend on fixed canvas coordinates.
- New ordinary bounds-based widgets must be initialized inside the actual project canvas.
- Rectangular projects must use independent width and height values.

### FR-3 — HTML workflow exclusion

- Do not modify HTML project construction, parsing, baking, rendering, sizing, positioning, reference-canvas behavior, or background construction under this spec.
- The user remains responsible for resizing and repositioning baked HTML output according to the design.
- HTML-generated time hands, gauges, icons, `IMG_LEVEL` frames, image switchers, and custom PNGs retain their current workflow without new conversion or prompt logic.

### FR-4 — Optional position-only rearrangement

- When an FVWF's saved resolution differs from the currently selected model resolution, prompt before rearranging.
- The choices are `Keep original positions`, `Rearrange positions`, and `Cancel`.
- `Keep original positions` performs no element geometry mutations.
- `Rearrange positions` transforms project-space anchors/centers into the target coordinate system while preserving element width, height, rendered asset size, and asset-local pivots.
- Alignment-aware elements must transform the relevant left/center/right and top/center/bottom anchor, then reconstruct X/Y using the unchanged size.
- Generated digit start positions must be recalculated from the resulting bounds rather than blindly scaled.
- MAIN and AOD layouts must follow the same selected choice.
- If saved FVWF resolution metadata is absent, do not silently infer and convert geometry; preserve the saved layout and surface a clear legacy/mismatch choice when applicable.

### FR-5 — Protected TIME_POINTER pipeline

- `TIME_POINTER` is explicitly excluded from the new rearrangement helper.
- Do not modify its `center`, `pointerCenter`, bounds, built-in hand dimensions, custom hand dimensions, local pivots, composer reference ratio, cover geometry, preview calculation, or V2/V3 export calculation.
- Correct project canvas dimensions may continue to flow into Interactive Canvas; the existing time-pointer engine remains solely responsible for consuming them.
- Regression tests must prove time-pointer geometry and generated pointer parameters are unchanged by this feature.

### FR-6 — Preserve other specialized local geometry

- Keep the gauge renderer's `ANCHOR_SIZE = 145`, shared layer scale, tight crops, normalized pivot, and export resizing unchanged.
- Keep digit glyph measurement, tabular day/time cells, complete-day frame dimensions, and font asset generation unchanged.
- Keep natural-image behavior and current image/frame baking contracts unchanged.
- Keep `IMG_PROGRESS.bounds.width` spacing semantics unchanged.
- Do not convert asset-local pivot/position fields as project coordinates.

### FR-7 — Export consistency

- V2 and V3 must export against the same saved resolution used by Interactive Canvas.
- Replace background recognition that depends on an exact `480×480` rectangle with semantic background identity and/or the active config resolution.
- Do not change generator-version routing, model compatibility, or Firebase-backed spec-group selection.
- Do not alter time-pointer generator fallbacks or center logic under this spec.

### FR-8 — Backward compatibility and safety

- Existing FVWF files open without automatic resizing or rearrangement.
- A mismatch choice is applied to a cloned configuration and committed only after validation succeeds.
- Cancel or validation failure leaves the original project unchanged.
- MAIN/AOD visibility, z-order, effects, data types, filenames, gauge pairing, and switcher definitions remain unchanged.

## Manual Guide alignment

The repository Manual Guide establishes that Zepp widget coordinates (`x`, `y`, `center_x`, `center_y`) are device-space values, while IMG widgets inherit source-file resolution and cannot be programmatically scaled reliably. This spec therefore corrects project-space coordinates without treating natural asset size as canvas geometry.

## Non-goals

- Rewriting or normalizing the time-pointer engine.
- Changing any HTML project/import/bake/render behavior.
- Resizing HTML-generated or custom artwork during resolution conversion.
- Changing gauge authoring/import size behavior.
- Changing digit typography, IMG_DATE modes, glyph metrics, or complete-day effects.
- Changing Firebase Functions, Firestore, Storage, model documents, or spec-group documents.
- Changing compatibility or V2/V3 selection policy.
- Adding export support for the preview-only `image_layer` type.
- Deploying to the public storefront.

## Acceptance criteria

1. A new 466×466 project displays, edits, saves, reloads, and exports using 466×466 project coordinates throughout.
2. A 480×480 project retains current behavior.
3. A rectangular project uses independent width/height clamps and centers.
4. HTML project creation, parsing, baking, sizing, positioning, and background behavior remain unchanged.
5. Position-only rearrangement changes anchors/centers but leaves asset dimensions unchanged.
6. Keeping original positions produces no element geometry mutations.
7. Existing FVWF files are never silently converted.
8. Interactive Canvas and V2/V3 output agree on resulting coordinates.
9. `TIME_POINTER` preview/export geometry is unchanged in focused before/after regression fixtures.
10. Gauge sizes, normalized pivots, digit assets, IMG_LEVEL frames, icon sizes, and IMG_PROGRESS spacing remain unchanged.
11. TypeScript, focused tests, repository verification, private build, and private live verification pass after implementation approval.

## Exit criteria

- All approved tasks in `tasks.md` are complete.
- No protected specialized geometry is modified.
- Automated validation reports zero new failures.
- The private production bundle is deployed to `origin/main` only after implementation approval.
- The issue log and spec status are updated only after successful validation and deployment.
