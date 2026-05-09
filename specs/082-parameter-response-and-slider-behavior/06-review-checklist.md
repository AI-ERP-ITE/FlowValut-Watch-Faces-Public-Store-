# 06 - Review Checklist

## Constraint Compliance
1. Renderer logic not rewritten.
2. Effects internals not redesigned.
3. Filter math internals unchanged.
4. Parametric architecture unchanged.
5. Snapshot system unchanged.

## Parameter Response Compliance
1. UI and render spaces are separated.
2. Mapping profiles exist for required shadow parameters.
3. Mapping curves match required formulas.
4. Bidirectional mapping exists and is deterministic.

## Interaction Quality Compliance
1. Raw float display removed from user-facing controls.
2. Adaptive step logic active where configured.
3. Slider updates throttled with rAF + 16ms minimum debounce.
4. Precision normalization prevents float-noise churn.

## Validation Compliance
1. All required tests added.
2. Tests pass.
3. UX impact summarized per stage.
4. Performance impact summarized per stage.

## Process Compliance
1. Task-by-task approval respected.
2. Changed files printed after each stage.
3. Commits use required names and stage scopes.
