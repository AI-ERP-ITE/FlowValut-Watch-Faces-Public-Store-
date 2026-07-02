# specs/107-v2-v3-generator-parity-and-multi-model-readiness/tests.md

## Test Strategy
No runtime changes in this phase. This file defines required tests for the upcoming implementation phase.

## Matrix

### Generator/Model Matrix
1. V2 + 480x480 round
2. V2 + 466x466 round
3. V2 + 390x450 square
4. V3 + 480x480 round
5. V3 + 466x466 round
6. V3 + 390x450 square

### Behavior Matrix
For each matrix entry above, verify:
1. app.json uses expected configVersion and target structure.
2. TIME_POINTER hands render with correct pivot and center.
3. DATE/WEEK widgets render with correct assets.
4. ARC_PROGRESS renders foreground + faint background track.
5. BUTTON shortcut overlay works (where allowed).
6. AOD behavior matches intended mode policy.

## Pointer-Specific Tests (round vs square)
1. Same pointer asset + same element-local pivot values should preserve hand rotation behavior across model classes.
2. Center placement should follow element center, not inferred screen center.
3. Exported pointer files should be present and uniquely scoped when needed.

## Editor Fidelity Tests
1. Canvas viewport matches selected model resolution/aspect ratio.
2. Background frame and crop boundaries match model dimensions.
3. Element drag/resize bounds clamp to active model dimensions.

## Regression Guardrails
1. Existing 480x480 watchface exports unchanged for baseline cases.
2. Existing AOD exports remain valid.
3. No loss of custom hand/gauge/icon asset references.
