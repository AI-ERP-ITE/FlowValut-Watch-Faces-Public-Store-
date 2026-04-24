# Feature Specification: Element-Layer Data Validation Authority

**Feature Branch**: `[035-element-data-layer-validation]`  
**Created**: 2026-04-24  
**Status**: Draft

## Objective
Move data-binding validation to the element layer (UI abstraction), while preserving current widget generation and existing successful build/deploy flow.

## Requirements
- Introduce single source of truth for `ELEMENT -> allowed DATA TYPES`.
- Expose reverse lookup `DATA TYPE -> allowed ELEMENTS` for deterministic filtering.
- Apply filtering in Add Element flow and Property panel edit flow.
- Add safe auto-correction when an element has invalid data type after element change.
- Keep widget mapping and code generation logic unchanged.
- Preserve existing `IMG_STATUS` behavior using `statusType` (do not regress this path).
- Add non-blocking guidance for `IMG_LEVEL` cardinality:
  - progress metrics: 10 images
  - heart: 6 images
  - weather: 29 images

## Validation
- Selecting each element shows only its allowed data list.
- Switching element type auto-corrects invalid bound `dataType`.
- Existing status indicator creation/edit still uses `statusType` options.
- Existing export pipeline and generated ZPK widget mapping remain unchanged.
- Build succeeds with no TypeScript errors in changed files.

## Process Compliance (specsmd-mater)
- This is a Zepp task and must follow full stage flow:
  - ANALYZE -> LOCATE -> CLARIFY -> PLAN -> CONFIRM -> IMPLEMENT -> BUILD -> DEPLOY -> VERIFY
- If any stage is skipped, output is invalid and flow restarts from ANALYZE.
- Execution guard:
  - Do not implement before approval.
  - Do not execute multiple stages in a single stage gate.
  - Do not continue past PLAN without approval.
- Approval keywords accepted by process: `approve` or `proceed`.
