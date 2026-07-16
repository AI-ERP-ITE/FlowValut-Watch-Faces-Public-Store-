# Spec 120 — Rearrangement, Render, and Export Parity

**Created:** 2026-07-16  
**Status:** Approved for implementation  
**Domain:** ZEP P shared Studio core  
**Deployment:** Private Pages only (`origin/main`)

## Problem

Spec 119 established saved project resolution as coordinate authority, but its position-only conversion interpreted protected widgets too broadly and excluded `TIME_POINTER` entirely. A 466↔480 conversion can therefore leave a stored pointer center in the old coordinate system. The editor also stretches the dedicated project background to the active canvas while export packs the original raster unchanged. The resulting preview can appear aligned even though the device receives target-space widget coordinates over a source-sized background. Rearrangement also changes resolution without adopting the selected target model identity.

## Required behavior

1. Rearrangement is a separate transaction over already-created elements. It must not invoke or modify HTML, pointer, gauge, icon, digit, frame, or switcher creation/baking engines.
2. Every widget participates in project-space placement conversion. No widget type is excluded from transforming its project-space anchor or center.
3. `TIME_POINTER.center` and `TIME_POINTER.pointerCenter` transform into the target project space. Hand sources, natural dimensions, local pivots, `hourPos`, `minutePos`, `secondPos`, cover geometry, composer ratios, effects, and export preparation remain unchanged.
4. MAIN and AOD are converted independently from the same source resolution in one transaction. Later manual MAIN edits do not silently overwrite a deliberately independent AOD layout.
5. Safe layout sizes may scale only where the existing generator already regenerates or natively sizes the output. Specialized raster/frame/pointer/gauge assets retain their existing size when safe resizing would require changing their engine.
6. The dedicated MAIN background is normalized to the target canvas when rearrangement is selected. A dedicated uploaded AOD background follows the same rule when available. HTML-created element assets are not background-normalized.
7. Rearrangement adopts the selected target model name together with its resolution. Firebase model/spec data remains the authority for model identity, compatibility, device sources, and generator-version capability.
8. Export consumes the already-rearranged configuration exactly once. No generator or packager performs another coordinate conversion.
9. Before packaging, the dedicated background raster dimensions must match `config.resolution`; otherwise export must normalize it or fail with a clear error rather than silently producing preview/device drift.

## Safe size policy

- Always transform positions, explicit centers, and pointer centers.
- Scale simple generated/native layout metrics only: TEXT font size; generated digit/date/week/time bounds; ordinary geometric shape bounds/radius/line width.
- Preserve specialized asset-local geometry and frame arrays.
- Use independent X/Y position ratios. Use one uniform size ratio, `min(targetWidth/sourceWidth, targetHeight/sourceHeight)`, to avoid aspect distortion.
- The project background is the sole mandatory raster resize because it defines the target canvas surface.

## Acceptance criteria

- A center at `(240,240)` becomes `(233,233)` for 480→466 and returns to `(240,240)` for 466→480 within numeric tolerance.
- MAIN and AOD are both transformed once.
- HTML and PNG time hands rotate around the transformed global center while all local hand geometry is byte/field identical.
- The selected target model and target resolution reach the exported manifest/generator path.
- A 466 background becomes a 480 background for a 466→480 rearrangement, matching Studio preview and device export.
- V2 and V3 emit the transformed coordinates without a second scale.
- Keep and Cancel retain their existing non-mutating behavior.

