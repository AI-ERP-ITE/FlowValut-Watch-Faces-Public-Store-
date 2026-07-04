# specs/111-v3-manifest-and-packaging-no-risk-patch/tasks.md

## Task List

### T001 - Document V3 manifest mismatches
- Inputs: generated Firebase V3 package evidence, supplied V3 reference snippet, Zepp docs/manual notes
- Output: mismatch table in `validation.md`
- Status: planned

### T002 - Define V3-only edit boundary
- Confirm edits are limited to `app/src/lib/jsCodeGenerator.ts` for first pass
- Explicitly mark `app/src/lib/jsCodeGeneratorV2.ts` as no-touch
- Status: planned

### T003 - Specify manifest-only patch set
- Candidate fields:
  - root `module.watchface` placement
  - extensionless watchface path
  - runtime block normalization if still justified by evidence
- Output: implementation slice in `validation.md`
- Status: planned

### T004 - Regenerate and extract one V3 package after patch
- Validate outer `app.json`, `device.zip/app.json`, `watchface` path consistency, and `app-side.zip`
- Status: planned

### T005 - Decide if shared builder must split
- Inputs: post-patch install result + extracted package evidence
- Decision:
  - If resolved -> stop, keep shared builder unchanged
  - If unresolved and shared builder implicated -> create V3-specific packer plan
- Status: planned

### T006 - Define V3-specific builder split only if required
- New files if needed:
  - `zpkBuilderV3.ts`
  - dispatcher wrapper / minimal routing change
- Preserve existing V2 builder behavior
- Status: conditional

### T007 - Prepare final verification matrix
- One V3 466-round install candidate
- One V2 regression smoke check (extract-only, not changed)
- Status: planned