# Zepp Watch Preview Calibration Notes

## Goal
Match studio preview output to perceived on-watch output as closely as possible, especially for shadows, emboss/engrave, and icon effects.

## 1. Officially Documented Facts (Confirmed)

### Image Source Recommendation
- Zepp docs explicitly recommend 24-bit or 32-bit PNG in RGB/RGBA for image widgets.
- Source: https://docs.zepp.com/docs/reference/device-app-api/newAPI/ui/widget/IMG/

### Alpha and Widget Color Controls Exist
- Widgets expose alpha/transparency and color fields.
- Sources:
  - https://docs.zepp.com/docs/reference/device-app-api/newAPI/ui/widget/IMG/
  - https://docs.zepp.com/docs/reference/device-app-api/newAPI/ui/widget/CIRCLE/

### AOD and Visual Constraint Guidance Is Explicit
- AOD guidance includes black background, reduced lit pixels, avoiding seconds, and stroke/outline-focused treatment.
- Additional practical color guidance exists (for example: at least one RGB channel >= 128, gray > 153, large areas with channel > 182 should be outlined).
- Sources:
  - https://docs.zepp.com/docs/designs/customization/screen-off-mode/
  - https://docs.zepp.com/docs/watchface/specification/

### Preview-on-Watch Is the Official Validation Path
- Official quick start emphasizes deploy/preview on actual watch via QR.
- Source: https://docs.zepp.com/docs/guides/quick-start/preview/

## 2. Inferred (Strong, But Not Explicitly Specified)
- Zepp intentionally publishes design constraints, but not low-level display pipeline internals.
- Different models and panels likely differ enough that one universal profile is not perfect.
- A calibrated profile per watch family/model is the practical approach.

## 3. Unknown (Not Publicly Specified)
- Exact firmware gamma/transfer function.
- Exact anti-aliasing and image resampling behavior per widget type.
- Exact dithering/quantization algorithm.
- Exact edge enhancement/sharpening behavior.
- Exact simulator-preview parity model from Zepp itself.

## 4. Current Project Controls (Where We Apply Calibration)
Current preview simulation is implemented in the studio canvas pipeline:
- Device simulation pass: app/src/components/InteractiveCanvas.tsx
- Current tunable constants:
  - DEVICE_SIM_GAMMA
  - DEVICE_SIM_CONTRAST
  - DEVICE_SIM_DITHER
  - DEVICE_SIM_SHARPEN_CENTER
  - DEVICE_SIM_SHARPEN_NEIGHBOR

Engrave/emboss parity normalization is shared by preview and export:
- app/src/lib/engraveFrameRenderer.ts
- normalizeEngraveFrameForParity(...)

## 5. How To Use This To Your Benefit
Use a constrained, repeatable tuning loop instead of ad-hoc visual tweaks.

### Rule A: Keep Official Constraints as Hard Rules
- Always respect documented AOD and color constraints.
- Do not tune simulation in a way that violates official guidance.

### Rule B: Tune Only a Small Parameter Set
Adjust only these preview parameters for parity:
- gamma
- contrast
- dither
- sharpen center
- sharpen neighbor
- shadow gain (if needed later)

This prevents overfitting and keeps behavior stable.

### Rule C: Per-Model Profile Strategy
Maintain one profile per device/model class, then switch profile values when testing on that model.

Suggested profile IDs:
- AMOLED_ROUND_BALANCED
- AMOLED_ROUND_HEAVY
- AMOLED_SQUARE_BALANCED
- LCD_BALANCED

## 6. Practical Calibration Procedure
1. Enable Device Preview mode in studio.
2. Use one fixed stress scene containing:
   - drop shadows
   - emboss/engrave frame
   - icon hue/saturation/colorize
   - thin and thick text
3. Deploy to watch via QR and compare.
4. Tune in this order:
   - gamma
   - contrast
   - sharpen center/neighbor
   - dither
5. Re-check shadows and edge halos after each change.
6. Save chosen constants under a named profile.

## 7. Acceptance Targets (Practical)
- Visual parity for edge hardness within subjective equivalence at normal viewing distance.
- No obvious mismatch in shadow weight between preview and watch.
- No over-crunching artifacts in flat icon regions.
- AOD variant still compliant with documented constraints.

## 8. Next Implementation Step (Recommended)
Add a profile selector in Studio UI and map each profile to the five simulation constants. This enables:
- quick model switching
- stable team workflow
- reproducible parity behavior

## 9. Summary
Official docs provide constraints and asset guidance, not full display pipeline internals. The winning strategy is:
- follow docs as hard limits
- apply controlled simulation tuning in preview
- validate on real watch
- store per-model profiles
