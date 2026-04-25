# Process: Gauge Pointer Editor Parity Through ZPK

## Objective
Complete the missing visual asset + transform layer for `GAUGE_POINTER` so preview/editor/export parity matches first-class element behavior and Zepp IMG_POINTER runtime requirements.

## Process Rules
- Follow strict stage order from specsmd-mater.
- Execute tasks sequentially, one by one.
- Keep deterministic outputs and avoid unrelated refactors.

## Coordinate System Bridge
### Editor Space
- `bounds.x`, `bounds.y`, `bounds.width`, `bounds.height`
- `pivotX`, `pivotY` normalized (0..1)

### Zepp Space
- `center_x`, `center_y`: pivot in screen coordinates
- `x`, `y`: pivot inside pointer image

### Conversion
- `center_x = bounds.x + bounds.width * pivotX`
- `center_y = bounds.y + bounds.height * pivotY`
- `x = bounds.width * pivotX`
- `y = bounds.height * pivotY`

## Preview Rotation Formula
- `angle = start_angle + (end_angle - start_angle) * progress`

## Required Asset Guarantee
- If element `src` missing/invalid, fallback to deterministic default pointer PNG.
- Export must package exactly the source referenced in generated IMG_POINTER.

## Validation Steps
1. Build passes.
2. Preview shows pointer and live rotation.
3. ZPK generation succeeds.
4. Extracted `watchface/index.js` has valid IMG_POINTER config and src.
5. Extracted assets contain referenced pointer PNG.
