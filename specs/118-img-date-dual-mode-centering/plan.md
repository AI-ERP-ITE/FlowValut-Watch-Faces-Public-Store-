# Spec 118 — Implementation Plan

## Minimal file plan

1. `src/types/index.ts`: persist the optional day mode.
2. `src/lib/dateImageMode.ts`: centralize mode normalization and deterministic filenames.
3. `src/components/PropertyPanel.tsx`: add the day-only toggle and Effects navigation.
4. `src/components/InteractiveCanvas.tsx`: use tabular two-cell geometry for numeric days and retain centered complete-day preview behavior.
5. `src/StudioApp.tsx`: generate ten tabular digits or 31 complete day canvases per element/scope.
6. `src/lib/jsCodeGeneratorV2.ts` and `src/lib/jsCodeGenerator.ts`: emit mode-specific arrays, flags, and origins.
7. Focused Vitest files plus verifier assertions: cover legacy FVWF behavior, V2/V3 parity, array counts, and filename isolation.

## Execution order

1. Add the normalized persisted mode and pure naming/geometry helpers.
2. Add focused tests for defaults, filenames, and generator contracts.
3. Implement both asset-generation branches.
4. Wire preview and Property Panel toggle.
5. Validate supplied-FVWF compatibility and MAIN/AOD duplication.
6. Run TypeScript, focused tests, verifier, and explicit private build.
7. Commit runtime/tests separately, deploy privately, and verify live entrypoint parity.

## Rollback

- The optional field defaults to existing numeric behavior.
- Complete mode is isolated behind the toggle.
- If complete-character firmware validation fails, keep the numeric centering fix and disable the toggle rather than altering unrelated digit widgets.
