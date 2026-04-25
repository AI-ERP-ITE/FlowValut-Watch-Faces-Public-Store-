# Feature Specification: Gauge Pointer Editor Parity + Visual Transform Completion

**Feature Branch**: `[037-gauge-pointer-editor-parity]`  
**Created**: 2026-04-25  
**Status**: Draft

## Problem Statement
Current `GAUGE_POINTER` implementation satisfies existence/mapping/generation but fails first-class editor parity:
- No guaranteed pointer PNG asset fallback
- No preview rendering path with transform-origin + rotation
- No normalized pivot model (`pivotX/pivotY`) exposed in editor
- No full parity with other elements for shadow/effects/bake behavior

Result:
- Selection handles are visible
- Pointer graphic can be invisible
- Rotation preview is missing or inconsistent

## Goal
Make `GAUGE_POINTER` a first-class editable element in the same parity class as other visual elements while still producing correct Zepp `hmUI.widget.IMG_POINTER` output.

## Scope
### In Scope
1. New pointer parity spec set and task flow.
2. Editor parity model for `GAUGE_POINTER`:
   - Box-based editing (`bounds.x/y/width/height`)
   - Normalized pivot (`pivotX`, `pivotY`) for UI manipulation
   - Start/end angle controls
3. Visual preview rendering:
   - Real image draw (not placeholder)
   - Transform-origin semantics derived from normalized pivot
   - Rotation simulation based on data progress
4. Asset fallback:
   - Deterministic default pointer image fallback
   - Always valid source for export/generation
5. Generation/export bridge:
   - Convert editor model to Zepp model (`center_x/center_y/x/y`)
   - Ensure final `src` points to packaged PNG
6. Effect parity:
   - Support same style of shadow/effect/bake behavior applied to comparable image elements

### Out of Scope
- Refactoring unrelated widgets
- Changing Zepp runtime semantics for IMG_POINTER
- Rewriting legacy TIME_POINTER behavior

## Functional Requirements
1. `GAUGE_POINTER` MUST render in preview with its image.
2. `GAUGE_POINTER` MUST rotate in preview using:
   - `angle = start + (end - start) * progress`
3. `GAUGE_POINTER` MUST support drag + resize + z-index like other elements.
4. `GAUGE_POINTER` MUST expose normalized pivot controls (`pivotX`, `pivotY`, range 0..1).
5. Generator MUST map editor coordinates to Zepp parameters:
   - `center_x = bounds.x + bounds.width * pivotX`
   - `center_y = bounds.y + bounds.height * pivotY`
   - `x = bounds.width * pivotX`
   - `y = bounds.height * pivotY`
6. If `src` is missing/invalid, system MUST fallback to deterministic default pointer PNG.
7. Export/ZPK MUST include the pointer PNG referenced by generated code.
8. Drop-shadow/effect/bake parity MUST apply to gauge pointer path where supported by existing pipeline rules.

## Non-Functional Requirements
- Deterministic behavior (no random geometry/effect output)
- Backward compatibility for existing GAUGE_POINTER elements lacking pivot fields
- Build passes without new TypeScript errors in touched files

## Acceptance Criteria
1. Preview shows visible pointer image for newly added GAUGE_POINTER without manual upload.
2. Preview rotation changes with simulated progress.
3. Resizing GAUGE_POINTER updates pivot mapping correctly (pivot scales with image).
4. Generated code contains valid IMG_POINTER block with non-empty `src`, and correct converted pivot params.
5. ZPK contains referenced pointer image and watch displays pointer.
6. Existing TIME_POINTER behavior remains unchanged.
