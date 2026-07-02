# specs/107-v2-v3-generator-parity-and-multi-model-readiness/spec.md

## Goal
Define a no-code-change execution spec to:
1. Audit V2 vs V3 generator feature parity widget-by-widget.
2. Identify missing V3 behaviors currently present in V2.
3. Define model/version routing policy so generator version selection follows model/spec metadata, not hardcoded model-name arrays.
4. Define multi-resolution editor-readiness requirements (round/square, non-480).

## Scope
In scope:
- `app/src/lib/jsCodeGeneratorV2.ts`
- `app/src/lib/jsCodeGenerator.ts`
- `app/src/StudioApp.tsx` (model resolution selection and background prep paths)
- `app/src/components/InteractiveCanvas.tsx` (canvas sizing constraints)
- `app/models.json`
- `app/specGroups.json`

Out of scope for this spec phase:
- Runtime code edits
- Deploy
- Data migration of existing published entries

## Current Findings (Baseline)

### A. V2 vs V3 are NOT only ordering differences
- V2 and V3 use different manifest contracts (`configVersion`, app/module/targets structure).
- V2 has explicit NORMAL + AOD widget generation branches in `watchface/index.js` assembly.
- V3 currently emits normal-path widgets (`ONLY_NORMAL`) and does not mirror full V2 dual-branch AOD generation behavior.

### B. Confirmed parity areas
- TIME_POINTER main widget emission exists in both V2 and V3.
- GAUGE_POINTER/IMG_POINTER emission exists in both V2 and V3.
- ARC_PROGRESS dual-track behavior exists in both V2 and V3.
- BUTTON + IMG_CLICK overlay behavior exists in both V2 and V3.
- IMG_DATE/IMG_WEEK support exists in both V2 and V3 (including explicit per-element arrays).

### C. Confirmed divergence risks
- V2 has richer AOD branch orchestration (dedicated AOD background mode + duplicated AOD widgets with `ONLY_AOD`).
- V3 currently does not provide equivalent full AOD branch scaffolding in generated index output.
- Generator routing currently depends on hardcoded model name lists (risk of misrouting as model matrix evolves).

### D. Multi-model editor readiness risks (non-generator)
- Interactive canvas uses fixed square constants that can distort square/rect model preview behavior.
- Some background/render helper paths still assume single-dimension resolution behavior.

## Requirements

### R1. Generator parity matrix
Produce a formal parity matrix with status per behavior:
- Present in both
- Missing in V3
- Semantically different
- Needs explicit decision (keep/remove/port)

Minimum rows:
- Manifest contract
- TIME_POINTER
- DATE_POINTER
- GAUGE_POINTER
- ARC_PROGRESS
- IMG_TIME
- IMG_DATE
- IMG_WEEK
- TEXT_IMG
- BUTTON/IMG_CLICK
- AOD background behavior
- AOD widget duplication behavior
- Overlay suppression list behavior

### R2. Routing policy spec
Define canonical version selection order:
1. Resolve watch model -> specGroup (`models.json`).
2. Resolve `supportedConfigVersions` from `specGroups.json`.
3. Choose preferred generator according to policy:
   - if `v3` supported and not blocked by known parity blockers, choose V3
   - else choose V2
4. Include fallback safety behavior when metadata is missing.

### R3. Multi-resolution editor policy
Define required editor behavior:
- Canvas dimensions derived from selected model resolution (`width`, `height`) not fixed 480x480.
- Square models preserve square viewport framing.
- Rect models preserve rect viewport framing.
- Background generation uses both width and height.
- Drag/resize bounds clamp to active model dimensions.

### R4. Pointer model-independence clarification
Document that pointer pivot is element-local (hand image pivot + center coords) and should remain independent of model class, provided editor coordinate space is correct.

## Deliverables
- `plan.md` with staged implementation strategy.
- `tasks.md` with dependency-ordered executable tasks.
- `validation.md` with manual + static checks.
- `tests.md` with regression matrix across round/square and V2/V3.
- `MULTI_MODEL_ISSUE_LOG.md` dedicated to this track only.

## Exit Criteria
- All parity gaps are explicitly cataloged and decisioned.
- Generator routing policy is finalized in spec form.
- Multi-resolution editor requirements are explicit and testable.
- No code changed in this spec phase.
