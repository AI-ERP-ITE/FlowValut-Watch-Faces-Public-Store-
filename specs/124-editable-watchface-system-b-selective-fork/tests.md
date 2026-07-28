# System B Tests

## Copied baseline

- FVWF V1 parse/serialize tests.
- Project configuration and AOD serialization tests.
- Model-target direct, display-name, normalized-name, ambiguous-name, and resolution tests.
- Canvas rendering snapshots.
- V2 generator semantic snapshots.
- Extracted ZPK file/asset comparisons.
- QR payload tests.

## FVWC unit tests

- Create and round-trip schema version 1.
- Reject malformed and unknown-version projects.
- Import one and multiple FVWF sources.
- Reject unresolved models.
- Detect duplicate content.
- Preserve immutable source data.
- Preserve portable assets.
- Select and replace the base.
- Resolve stable source-layer references.

## Groups, slots, and variants

- Create a multi-layer group.
- Suggest but do not automatically own dependencies.
- Reject missing source layers.
- Reject fixed/variant ownership conflicts.
- Require at least one variant and one default.
- Prevent deleting the current default.
- Validate DATA_ONLY, STYLE_ONLY, and STYLE_AND_DATA.
- Validate bounds, digit capacity, and binding consistency.

## Editable V2 generator

- Keep normal baseline `editable: 0`.
- Emit editable output as V2 with `editable: 1`.
- Allocate stable unique edit IDs and custom type IDs.
- Emit default/optional types.
- Emit required titles and previews.
- Emit complete branches.
- Reject unsupported capabilities and missing assets.

## Integration scenario

```text
Base FVWF: Heart
Second FVWF: Steps
Slot: one numeric/image-level region
Default: Heart
Optional: Steps
AOD: FIXED_AOD or HIDDEN_IN_AOD
Target: one approved V2 device
```

Test import, grouping, slot creation, validation, FVWC round trip, editable generation, ZPK extraction, QR generation, installation, and on-watch switching.

## System A non-regression

- Verify protected hashes before and after every phase.
- Build current System A.
- Confirm current routes remain unchanged.
- Confirm normal generator output remains unchanged.

