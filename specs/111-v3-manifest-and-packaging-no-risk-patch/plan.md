# specs/111-v3-manifest-and-packaging-no-risk-patch/plan.md

## Objective
Prepare a no-risk execution plan to correct V3 watchface install failures while preserving all V2 output paths unchanged.

## Phase P1 — V3 Manifest Alignment
1. Compare generated V3 manifest fields against the approved/reference V3 shape.
2. Limit first-pass edits to `jsCodeGenerator.ts` V3 manifest generation only.
3. Explicitly avoid any edits to V2 generator files.

## Phase P2 — Validation After Manifest Alignment
1. Regenerate one V3 package locally.
2. Extract outer archive, `device.zip`, and `app-side.zip`.
3. Verify module placement, path shape, runtime shape, and asset references.
4. If package shape now matches reference expectations, stop and test install.

## Phase P3 — Shared Builder Risk Decision
1. If install still fails after manifest-only alignment, inspect shared builder assumptions in `zpkBuilder.ts`.
2. Determine whether suspected builder changes are safe for both V2 and V3.
3. If not safe, create a separate V3 builder path rather than modifying the shared implementation.

## Phase P4 — Optional V3 Builder Split
1. Keep current builder as legacy/shared safe path for V2.
2. Add V3-specific packer only if required by evidence.
3. Route by `config.configVersion` at a narrow dispatcher boundary.

## Safety Gates
1. No edits to `jsCodeGeneratorV2.ts`.
2. No edits to shared builder until manifest-only validation is complete.
3. Any shared-file mutation must include explicit proof that V2 output is unaffected, or else be split.

## Milestones
- M1: Spec and issue tracking created.
- M2: Manifest-only mismatch list approved.
- M3: V3-only manifest patch executed and validated.
- M4: Shared builder split decision made only if still needed.

## Non-goals
- No deploy in planning phase.
- No V2 migration or modernization.
- No routing policy changes for version selection in this track.