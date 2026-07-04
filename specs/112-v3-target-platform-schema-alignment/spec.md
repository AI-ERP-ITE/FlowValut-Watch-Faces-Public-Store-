# specs/112-v3-target-platform-schema-alignment/spec.md

## Goal
Resolve likely V3 install rejection causes by aligning generated app.json target and platform schema to the guide-backed structure without touching V2 behavior.

## Problem
V3 export still fails install. Prior fixes corrected runtime and TIME_POINTER asset pathing, but generated manifest still differs from guide in two high-risk areas:
1. module.watchface at root instead of inside targets.default.module
2. platforms entries missing st/sr shape-resolution fields

## In Scope
1. app/src/lib/jsCodeGenerator.ts V3 app.json generation.
2. Helper mapping logic needed to derive st/sr from selected device/spec group.
3. Build and generated-output validation.

## Out of Scope
1. app/src/lib/jsCodeGeneratorV2.ts edits.
2. zpk builder structural changes.
3. Firebase function changes.

## Requirements

### R1 — Target module placement
Generated V3 manifest must place watchface module at targets.default.module.watchface.

### R2 — Platform shape fields
Each platform entry must include st and sr.

### R3 — Compatibility retention
Keep deviceSource in platform entries to preserve existing device targeting behavior.

### R4 — Path stability
watchface path remains watchface/index.

### R5 — V2 isolation
No behavioral or source changes in V2 generator.

## Acceptance Criteria
1. app/src/lib/jsCodeGenerator.ts emits app.json with:
   - targets.default.module.watchface
   - platforms[{ st, sr, name, deviceSource }]
2. app/src/lib/jsCodeGeneratorV2.ts unchanged.
3. npm run build:private succeeds.
4. No new diagnostics in edited file.

## Notes
st/sr mapping is derived from model specGroup where available, with safe fallback from export resolution.
