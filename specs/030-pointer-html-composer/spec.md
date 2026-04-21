# Spec 030 - Pointer HTML Composer (Separated Hand Inputs)

## Problem
Current pointer HTML flow uses one pasted composite HTML/SVG and attempts to derive hour/minute/second/hub assets. In practice, mixed layers, transforms, and missing IDs cause cross-contamination (extra hubs, broken fragments, hand pieces leaking across assets), wasting user time.

## Goal
Introduce a dedicated Pointer HTML Composer section where users paste separate code for each layer:
1. Hour HTML
2. Minutes HTML
3. Seconds HTML
4. Hub HTML

The system composes these layers deterministically for preview/export and provides per-hand pivot controls relative to hub center.

## User Requirements (Confirmed)
1. New dedicated UI section for pointer composition.
2. Separate input windows for hour/minute/second/hub HTML.
3. Internal code gathers all layers into one acceptable composed design.
4. Default demo orientation in composer preview:
   - Hour points to 2 PM
   - Minute points to 10 PM position
   - Second points to 12 AM
5. Pivot controller per hand to slide hand anchor relative to hub (more/less tail before hub).
6. Preserve reliable proportions and pivot alignment in export.

## Functional Requirements
### FR1 - Composer UI
1. Add a new Pointer Composer panel in the hand workflow.
2. Provide four text editors: hour, minute, second, hub.
3. Provide clear validation state per editor (valid/invalid/empty).

### FR2 - Layer Rendering Contract
1. Each editor input is parsed independently.
2. Rendering pipeline generates four independent raster layers.
3. Failure in one editor must not silently replace other layers.
4. Fallback behavior must be explicit (show warning in UI).

### FR3 - Composite Preview
1. Add a composition preview canvas.
2. Render hub at center.
3. Render three hands around center using configurable pivots.
4. Initial preview angles must match requested defaults:
   - Hour = 60 degrees (2 PM)
   - Minute = 300 degrees (10 PM mark)
   - Second = 0 degrees (12 AM)

### FR4 - Pivot Controls
1. Provide per-hand pivot controls with X/Y offsets relative to hub center.
2. Controls must update preview in real time.
3. Stored pivot values must flow into TIME_POINTER export positions.

### FR5 - Save and Reuse
1. Save composed style as one custom hand preset record.
2. Record contains four source snippets + rendered PNG outputs + pivot values.
3. Selecting the style auto-applies pivots to TIME_POINTER.

### FR6 - Export Consistency
1. Exported hour/minute/second/cover assets must come from corresponding layer inputs.
2. No cross-layer contamination allowed by design.
3. Watch preview and generated ZPK must share same pivot math.

## Non-Goals
1. Auto-detecting hands from one combined SVG in this feature scope.
2. AI semantic splitting of arbitrary unstructured HTML.
3. Editing raw Zepp widget code directly in this feature.

## Success Criteria
1. User can paste four separate HTML/SVG snippets and save once.
2. Generated watchface has clean separated hands with no leaked parts.
3. Pivot slider changes visibly affect both preview and device output alignment.
4. Repeatability: same inputs produce same outputs across saves.

## Risks and Mitigations
1. Risk: Mixed HTML wrappers fail to render.
   - Mitigation: normalize by extracting first svg when present, otherwise render HTML sandbox fallback with error reporting.
2. Risk: Pivot confusion.
   - Mitigation: show center crosshair + per-hand anchor marker in preview.
3. Risk: Regression with existing custom-hand presets.
   - Mitigation: keep backward compatibility path for legacy single-code presets.
