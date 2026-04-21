# Implementation Plan: Pointer Effects + Parity Pipeline

**Branch**: `[031-pointer-effects-parity-pipeline]` | **Date**: 2026-04-21 | **Spec**: `/app/specs/031-pointer-effects-parity-pipeline/spec.md`
**Input**: Feature specification from `/app/specs/031-pointer-effects-parity-pipeline/spec.md`

## Summary

Deliver a narrowly scoped enhancement that adds pointer effect controls (brightness, contrast, saturation, opacity) and enforces deterministic parity across composer preview, adjustment preview, and baked export. The implementation must support both source-based custom pointer packs and legacy normalized pointer packs while preserving baseline behavior for projects with no pointer effect edits. Scope is explicitly limited to this feature and excludes reopening, reworking, or completing any item from spec 030.

## Technical Context

**Language/Version**: NEEDS CLARIFICATION (not specified in spec.md)  
**Primary Dependencies**: NEEDS CLARIFICATION (not specified in spec.md)  
**Storage**: Existing project save/reload mechanism with added pointer effect values (assumed by spec)  
**Testing**: Deterministic parity verification steps defined in spec.md (fixture-based repeated comparisons)  
**Target Platform**: Watchface composer/preview/export workflow used by watchface authors  
**Project Type**: UI + rendering/export pipeline enhancement  
**Performance Goals**: At least 95% first-run parity pass rate across both pack types for unchanged input state (SC-002)  
**Constraints**: Deterministic parity for same input state; backward compatibility for projects without pointer edits; parity failures must report stage-specific mismatch details  
**Scale/Scope**: Two pointer pack source types, four effect controls, three output stages (composer preview, adjustment preview, baked export)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution file at `.specify/memory/constitution.md` is currently a placeholder template with no enforceable project principles or gates populated.

- Pre-Phase-0 gate status: PASS (no active constitutional constraints defined).
- Post-Phase-1 re-check requirement: Reconfirm after design artifacts are produced; expected PASS unless constitution is populated meanwhile.

## Project Structure

### Documentation (this feature)

```text
app/specs/031-pointer-effects-parity-pipeline/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
app/src/
├── components/
├── context/
├── lib/
├── pipeline/
└── types/

app/scripts/
```

**Structure Decision**: Use the existing app single-project frontend/pipeline layout. Limit changes to pointer effects and parity flow code paths only. Do not include unrelated 030 workstreams, unfinished items, or retrofits outside FR-001 through FR-010.

## Complexity Tracking

No constitution violations identified from current constitution content.
