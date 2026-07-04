# specs/112-v3-target-platform-schema-alignment/plan.md

## Objective
Apply a V3-only manifest schema correction that aligns target/module/platform fields with the current guide evidence, while keeping V2 generation behavior unchanged.

## Phase P1 — Define Scope and Safety
1. Restrict code edits to V3 path in app/src/lib/jsCodeGenerator.ts.
2. Keep app/src/lib/jsCodeGeneratorV2.ts untouched.
3. Keep packaging builder unchanged in first pass.

## Phase P2 — Manifest Shape Alignment
1. Move watchface module block under targets.default.module.
2. Keep path as watchface/index and current runtime/type fields.
3. Add st/sr fields to each platforms item.
4. Retain deviceSource as compatibility fallback for known device IDs.

## Phase P3 — Build Validation
1. Run private build to confirm TypeScript and bundle success.
2. Verify no new errors in edited files.

## Phase P4 — Output Validation
1. Generate one V3 sample manifest from current generator path.
2. Confirm emitted JSON includes:
   - targets.default.module.watchface
   - platforms entries with st and sr
   - path watchface/index
3. Confirm V2 generator file unchanged.

## Safety Gates
1. No edits outside V3 generator unless strictly required.
2. No changes to V2 code path.
3. Stop and report if unexpected cross-version break appears.

## Exit Criteria
1. V3 manifest matches new target/module/platform schema contract.
2. Build passes.
3. Task checklist completed with evidence notes.
