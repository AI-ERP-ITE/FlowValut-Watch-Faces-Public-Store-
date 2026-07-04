# specs/111-v3-manifest-and-packaging-no-risk-patch/spec.md

## Goal
Define a V3-only corrective plan for watchface export/install failures without changing any V2 generator or V2 package behavior.

## Problem Statement
The current generated V3 watchface package builds successfully and downloads successfully, but Zepp App install flow reports failed to load ZPK for at least 466x466 round devices.

Confirmed findings gathered before this spec:
- Generated Firebase V3 package is a readable `.zpk` and contains valid zip structure.
- Existing repo/package references under `app/zpk`, `app/docs/zpk`, and `app-public-sync/zpk` are all V2.
- Working imported package samples for Active-class 466 devices are also V2-based (`.zip` / `.zab`), so they are useful for delivery context but not for V3 schema validation.
- Current V3 manifest generation differs from the supplied/reference V3 schema in at least these ways:
  - `module.watchface` nested under `targets.default.module` instead of root-level `module.watchface`
  - `watchface/index.js` path emitted instead of extensionless module path like `watchface/index`
  - runtime block shape differs from reference V3 snippet

## In Scope
- `app/src/lib/jsCodeGenerator.ts` V3-only manifest generation path
- Optional V3-only export/packaging isolation if manifest-only correction is insufficient
- Spec/design for a separate V3 packer if shared `zpkBuilder.ts` cannot be changed safely
- Validation procedure for generated V3 packages before deploy/install tests

## Out of Scope
- Any edits to `app/src/lib/jsCodeGeneratorV2.ts`
- Any intentional behavior change to V2 exports
- Any broad refactor of shared export logic without proof it is required
- Deploy in this spec phase

## Hard Safety Rule
If a file is shared by V2 and V3 and a required V3 correction would materially alter V2 output shape, create a V3-specific implementation path instead of modifying the shared path in place.

## Current Baseline

### B1. V3-only generator entry already exists
- `generateWatchFaceCode(config)` dispatches by `config.configVersion`
- V3 path is isolated inside `generateWatchFaceCodeV3()` and `generateAppJson()` in `jsCodeGenerator.ts`
- This makes manifest-only correction a low-risk first move

### B2. Shared builder risk exists
- `zpkBuilder.ts` packs both V2 and V3 through one builder path
- Outer archive assembly, `device.zip`, and `app-side.zip` are version-agnostic today
- Any packaging correction beyond manifest shape may require V3-specific split to protect V2

### B3. Reference mismatch summary
- Reference V3 snippet indicates root `module.watchface`
- Reference V3 snippet indicates extensionless module path (`watchface/index`)
- Generated V3 package currently uses nested target module plus `.js` suffix

## Requirements

### R1. V3 manifest-only first strategy
The first implementation pass must be limited to V3 manifest generation unless new evidence proves packaging-layer differences are also required.

### R2. Zero V2 behavior change
No direct edits to V2 generator behavior are allowed in this track.

### R3. Shared-file split threshold
If correction requires changing shared `zpkBuilder.ts` semantics in a way that could alter V2 package output, introduce a V3-specific builder path instead.

### R4. Evidence-first validation
Every proposed V3 change must be justified by one of:
- extracted generated V3 package evidence
- provided V3 schema/reference snippet
- local/manual Zepp guide evidence
- official Zepp docs/repo evidence

### R5. Pre-deploy package validation
Before any deploy/install test, generated V3 output must be inspected for:
- outer `app.json`
- `device.zip/app.json`
- `watchface/index.js` location and reference path consistency
- `app-side.zip` contents
- expected asset presence

## Deliverables
- `plan.md`
- `tasks.md`
- `validation.md`
- `tests.md`
- Issue log entry for this track

## Exit Criteria
- A V3-only patch plan exists with file-by-file isolation boundaries
- Shared-file split criteria are explicit
- Validation/test gates are defined before any runtime edit
- V2 untouched guarantee is documented