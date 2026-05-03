# Spec 065: Color Control Visibility and Mask Integrity

## Goal
Resolve three blocking issues together:
1. Inverted element masks must render reliably across all element types (including ticks).
2. Warning color mode must be visibly actionable in-canvas with live violation tracking.
3. Enforce color mode must apply closest-safe mapping per pixel/channel without flattening the whole preview to a uniform gray look.

## Scope
- Parametric preview path in `src/ParametricPage.tsx`.
- Engine geometry/composition propagation in `engine/core/geometry.js` and `engine/core/composer.js`.
- Color enforcement/warning logic in `engine/color/colorController.js`.
- Renderer mask usage in `engine/core/renderer.js` must be validated against mask propagation.

## Functional Requirements
1. `mask` data must survive template -> geometry -> compose -> render pipeline without being dropped.
2. Inverted masks (`invert: true` with reveal strokes) must clip output as authored for ticks and non-ticks.
3. Warning mode must display:
   - red live warning tracker,
   - violation count and ratio,
   - orange overlay that marks violating pixels on preview.
4. Warning diagnostics must include top offending elements (element-by-element summary).
5. Enforce mode must keep full-element coverage while mapping each channel to nearest allowed grayscale-safe value (closest-safe behavior, not one global tone).
6. Existing off/warning/enforce mode switching must remain stable and fast enough for interactive editing.

## Acceptance Criteria
1. Masked ticks case with invert+reveal no longer renders fully unmasked.
2. Engine SVG for masked element contains both mask definition and mask usage.
3. Warning mode shows visible tracker and orange pixel overlay over violating zones.
4. Enforce mode no longer collapses dark fills to a broad uniform gray cast; dark colors are remapped to nearest valid values.
5. Typecheck passes.
6. Private build passes.
7. Deploy sync updates docs/root hashes.
