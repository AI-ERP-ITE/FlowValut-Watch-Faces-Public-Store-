# Phase 0 Research: Pointer Effects Bake Parity + Export Sizing Safety

## Decision 1: Use one frozen export snapshot per run

- Decision: Build/export must use a cloned `exportElements` snapshot and not live mutable editor state.
- Rationale: `StudioApp` already protects against preview/export drift with this snapshot pattern; parity and sizing checks must attach to that same immutable snapshot.
- Alternatives considered:
  - Re-read state during export stages: rejected because async mutations can desync pivots/assets.
  - Separate transient clone per sub-stage: rejected due additional drift surface.

## Decision 2: Keep pointer effects normalization shared by preview and export

- Decision: Continue using `normalizePointerEffects` as the single source for clamp/default behavior in both drawing and export bake.
- Rationale: Divergent normalization logic is a direct parity risk.
- Alternatives considered:
  - Export-only normalization rules: rejected because preview/export mismatch becomes expected.
  - Hand-layer custom clamping: rejected due hidden layer-specific drift.

## Decision 3: Treat missing TIME_POINTER assets as hard build blockers

- Decision: Preserve hard-fail behavior when referenced hand assets are missing before ZPK build.
- Rationale: Silent fallback masks root cause and produces non-deterministic device outcomes.
- Alternatives considered:
  - Auto-fallback to built-in assets on missing custom layer: rejected because this hides parity regressions.
  - Warn-only logging: rejected because release safety requires explicit fail-fast.

## Decision 4: Make parity checks deterministic and repeatable in-process

- Decision: Keep repeated parity comparison pass (`runPointerParityChecks`) and flag any drift across repeated computations.
- Rationale: Deterministic checks protect AG verdict quality and expose hidden non-determinism.
- Alternatives considered:
  - Single comparison pass only: rejected because transient canvas races can pass once and fail later.
  - Per-pixel exact equality only: rejected as too brittle for real image pipelines.

## Decision 5: Model export sizing as explicit metrics, not implicit assumptions

- Decision: Capture hand-layer export metrics (source dimensions, target dimensions, pivot coordinates, applied offsets, output filenames) in investigation artifacts.
- Rationale: Sizing bugs are root-cause opaque unless each transform step is measurable.
- Alternatives considered:
  - Infer sizing from final PNG only: rejected because pivot math cause is lost.
  - Document sizing manually in notes: rejected due poor repeatability.

## Decision 6: Validate generator defaults and baked assets together

- Decision: Pair extracted `watchface/index.js` pointer position checks with baked asset manifest checks in every run.
- Rationale: Correct JS with wrong baked images (or inverse) still fails on device.
- Alternatives considered:
  - JS-only validation: rejected because asset parity can still fail.
  - Manifest-only validation: rejected because pivot coordinates can still be wrong.

## Decision 7: Favor in-place pipeline hardening over refactor

- Decision: Keep architecture intact and harden existing seams (`StudioApp`, `pointerEffects`, `pointerParity`, `customHandStore`, generators, validators).
- Rationale: This is safest for release and aligns with feature non-goals.
- Alternatives considered:
  - Move export pipeline into new module tree now: rejected as scope creep and regression risk.
  - Rewrite pointer composer storage model: rejected because not needed to restore parity.
