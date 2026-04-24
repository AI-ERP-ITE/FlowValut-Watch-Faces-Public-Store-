# Process: Pointer Coverage Through ZPK Creation

## Scope
Deterministic implementation and validation for pointer capability completion:
- `TIME_POINTER` remains analog-clock-only.
- `IMG_POINTER` capability is represented by `GAUGE_POINTER` element mapping.

## Confirmed Pointer Preconditions
- Rendering order for clock hands: hour -> minute -> second.
- Pointer assets: avoid soft shadows; use clean silhouette + thin dark stroke.
- One image per hand for performance.
- If editable face has no editable background, keep pointer cap (`100%Cover`) for pivot concealment.

## Coordinate Rules
All pointers use dual pivot coordinates:
- Screen pivot: `center_x`, `center_y`
- Image pivot: `x`, `y`

## Implementation Steps
1. Add element type `GAUGE_POINTER`.
2. Add element-layer support list for bounded/progress data only.
3. Keep reverse mapping generation unchanged.
4. Map `GAUGE_POINTER` to `IMG_POINTER` in gap-audit map.
5. Do not alter UI logic or generator routing.

## Build + Audit Validation
1. Run `npm run build`.
2. Regenerate `GAP_AUDIT_REPORT.md`.
3. Confirm `missingElementForWidget` is empty.
4. Regenerate concise `GAP_AUDIT_SUMMARY.md`.

## ZPK Creation Path (No Refactor)
1. Use existing project packaging flow to generate watchface output.
2. Create `.zpk` artifact with existing toolchain.
3. Extract `.zpk` and verify generated files:
   - `app.json` structure remains valid.
   - `watchface/index.js` keeps `TIME_POINTER` for analog clock.
   - Data-gauge pointer capability is represented by `GAUGE_POINTER` in element/audit authority.
4. Capture verification notes in feature task checklist.

## Non-Goals
- No pointer math layer.
- No category abstraction changes.
- No merge of `TIME_POINTER` and `IMG_POINTER` semantics.
