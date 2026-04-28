# Implementation Plan: Device Parity Root-Cause (Pointer Bake Parity + Export Sizing)

**Branch**: `[032-device-parity-root-cause]` | **Date**: 2026-04-23 | **Spec**: `app/specs/032-device-parity-root-cause/spec.md`
**Input**: Feature specification from `app/specs/032-device-parity-root-cause/spec.md`

## Summary

Restore parity between pointer preview and baked export by hardening the existing TIME_POINTER export path, with a narrow scope on two risks: pointer effects bake drift and export sizing/pivot mismatch. Implementation stays inside current pipeline layers (`StudioApp` export preparation, pointer effects/parity utilities, generator defaults, and investigation validators) with no broad UI or architecture refactor.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19, Node.js runtime for scripts  
**Primary Dependencies**: Vite 7, JSZip, canvas, sonner, tsx, Vitest (available), ESLint 9  
**Storage**: Browser localStorage and IndexedDB (`customHandStore`) for pointer composer metadata and hand packs; file artifacts under `app/specs/032-device-parity-root-cause/investigation/`  
**Testing**: `npm run build`, `npm run lint`, investigation validators (`investigation:validate:nonintrusive`, `investigation:validate:zpk`, `investigation:validate:manifest`, `investigation:validate:minimums`, `investigation:validate:sc001`, `investigation:validate:coverage`)  
**Target Platform**: Web studio export pipeline targeting Zepp watchface package output and on-device verification  
**Project Type**: Single frontend application with build-time packaging scripts  
**Performance Goals**:
- Pointer parity mismatch ratio remains at or below tolerance (`POINTER_PARITY_TOLERANCE = 0.015`) for expected stages.
- Zero missing TIME_POINTER asset references before ZPK build.
- Export path remains deterministic for repeated runs with same fixture/build hash.
**Constraints**:
- Scope limited to diagnostics + safe fixes for pointer bake parity and export sizing.
- No intrusive instrumentation that mutates generated output semantics.
- Keep Zepp output assumptions unchanged (single TIME_POINTER with hour/minute/second hand refs, `px()` coordinates, valid `app.json` structure).
- Preserve rollback path via existing regeneration/rollback scripts.
**Scale/Scope**:
- One feature slice in `app/specs/032-device-parity-root-cause/`.
- Primary code touchpoints: `app/src/StudioApp.tsx`, `app/src/lib/pointerEffects.ts`, `app/src/lib/pointerParity.ts`, `app/src/lib/customHandStore.ts`, generator parity checks in `app/src/lib/jsCodeGenerator.ts` and `app/src/lib/jsCodeGeneratorV2.ts`, plus `app/scripts/*` validators.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

` .specify/memory/constitution.md ` is still a template with placeholders and no ratified enforceable principles. For this feature, constitutional gates are derived from repository safety rules and Feature 032 requirements.

### Pre-Phase 0 Gates

1. Scope gate: PASS  
  Work remains limited to pointer effects bake parity and export sizing/pivot correctness, with no unrelated redesign.
2. Non-intrusive diagnostics gate: PASS  
  Investigation captures metadata/evidence only; no behavior-changing debug overlays in exported assets.
3. Zepp contract gate: PASS  
  Plan preserves required output contracts for TIME_POINTER/app manifest structure.
4. Rollback gate: PASS  
  Existing rollback path (`app/scripts/rollback.ts`) retained; no irreversible data migrations planned.

### Post-Phase 1 Re-Check

1. Scope gate: PASS  
  Data model and quickstart are scoped to parity/sizing verification.
2. Non-intrusive diagnostics gate: PASS  
  Contracts require capture-only evidence, not output mutation.
3. Zepp contract gate: PASS  
  Design explicitly validates extracted `watchface/index.js`, `app.json`, and pointer asset references.
4. Rollback gate: PASS  
  Quickstart includes validator checkpoints and stop/rollback criteria on gate failure.

## Project Structure

### Documentation (this feature)

```text
app/specs/032-device-parity-root-cause/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── investigation-run-record.schema.json
│   ├── instrumentation-events.schema.json
│   └── evidence-pack-manifest.schema.json
├── investigation/
└── tasks.md
```

### Source Code (repository root)

```text
app/
├── src/
│   ├── StudioApp.tsx
│   ├── components/
│   │   └── InteractiveCanvas.tsx
│   ├── lib/
│   │   ├── pointerEffects.ts
│   │   ├── pointerParity.ts
│   │   ├── customHandStore.ts
│   │   ├── jsCodeGenerator.ts
│   │   └── jsCodeGeneratorV2.ts
│   └── types/
├── scripts/
│   ├── captureInvestigationRun.mjs
│   ├── checkInstrumentationNonIntrusive.mjs
│   ├── validateRunMinimums.mjs
│   ├── validateSc001MatrixIntegrity.mjs
│   ├── validateTwoDeviceClassCoverage.mjs
│   ├── validateZpkParity.mjs
│   └── verifyAssetManifest.mjs
└── package.json
```

**Structure Decision**: Keep current single-app structure and patch in-place. No new service/package split is introduced because parity+sizing faults originate in hand-off boundaries inside existing preview->export->generator flow. The safest path is to align these existing boundaries, then enforce them with current investigation contracts and validators.

## Complexity Tracking

No constitution violations requiring justification were identified.
