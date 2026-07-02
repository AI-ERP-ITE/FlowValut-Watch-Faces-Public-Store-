# specs/107-v2-v3-generator-parity-and-multi-model-readiness/tasks.md

## Task List

### T001 - Build parity matrix document
- Inputs: `jsCodeGeneratorV2.ts`, `jsCodeGenerator.ts`
- Output: behavior matrix section in `validation.md`
- Status: planned

### T002 - Classify parity gaps
- For each matrix mismatch, assign severity:
  - Critical (export correctness / AOD correctness)
  - High (model-routing correctness)
  - Medium (editor fidelity)
  - Low (cosmetic/logging)
- Status: planned

### T003 - Define metadata-driven routing algorithm
- Inputs: `models.json`, `specGroups.json`
- Output: pseudocode + decision table in `validation.md`
- Status: planned

### T004 - Define migration strategy from hardcoded model lists
- Include rollback/fallback when metadata missing.
- Include special handling for models that support both v2/v3.
- Status: planned

### T005 - Inventory fixed-size assumptions in editor
- Inputs: `InteractiveCanvas.tsx`, `StudioApp.tsx`
- Output: change-map list (file + behavior + desired contract)
- Status: planned

### T006 - Define pointer parity checks across model classes
- Scope: round vs square placement consistency with same element-local pivot.
- Output: test scenarios in `tests.md`
- Status: planned

### T007 - Define regression matrix
- Matrix dimensions:
  - Generator: V2/V3
  - Shape: round/square
  - Resolution class: 480x480, 466x466, 390x450, 320x380
  - Modes: normal/AOD
- Output: `tests.md`
- Status: planned

### T008 - Prepare implementation gate checklist
- Must-pass checks before code changes/deploy.
- Output: `validation.md`
- Status: planned
