# Tasks: Pointer Effects + Parity Pipeline

**Input**: Design documents from `/app/specs/031-pointer-effects-parity-pipeline/`
**Prerequisites**: `plan.md` (required), `spec.md` (required)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create narrowly scoped pointer-effects primitives for this feature only.

- [x] T001 Add pointer effect fields (brightness, contrast, saturation, opacity) and parity result typing to app/src/types/index.ts
- [x] T002 Create shared pointer-effects normalization/apply helpers in app/src/lib/pointerEffects.ts
- [x] T003 Add pointer-effects constants/default bounds for deterministic behavior in app/src/lib/pointerEffects.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish one deterministic parity mechanism shared by preview and export paths.

**⚠️ CRITICAL**: No user story work starts until this phase is complete.

- [x] T004 Create deterministic image comparison utility with fixed tolerance in app/src/lib/pointerParity.ts
- [x] T005 [P] Add parity verification result model and stage mismatch details in app/src/lib/pointerParity.ts
- [x] T006 Wire parity verification entry points into shared Studio flow state in app/src/StudioApp.tsx

**Checkpoint**: Foundation ready for user stories.

---

## Phase 3: User Story 1 - Adjust Pointer Visual Effects (Priority: P1) 🎯 MVP

**Goal**: Authors can independently edit pointer brightness, contrast, saturation, and opacity with persisted values.

**Independent Test**: Change each effect on a pointer pack, confirm immediate preview update, save, reload, and confirm values and visuals are preserved.

### Implementation for User Story 1

- [x] T007 [US1] Add pointer effect controls (brightness/contrast/saturation/opacity) to TIME_POINTER editor UI in app/src/components/PropertyPanel.tsx
- [x] T008 [US1] Apply pointer effects during TIME_POINTER preview rendering in app/src/components/InteractiveCanvas.tsx
- [x] T009 [US1] Persist pointer effect values through project state save/load in app/src/StudioApp.tsx
- [x] T010 [US1] Apply pointer effects in pointer asset bake/export path so exported pointers match edited values in app/src/StudioApp.tsx

**Checkpoint**: User Story 1 is independently functional.

---

## Phase 4: User Story 2 - Enforce Preview/Export Parity (Priority: P1)

**Goal**: Composer preview, adjustment preview, and baked export remain deterministic and stage-traceable.

**Independent Test**: Run the same non-default pointer effect state through all three stages and verify pairwise parity within fixed tolerance; failures identify the mismatching stage.

### Implementation for User Story 2

- [x] T011 [US2] Capture stage snapshots (composer preview, adjustment preview, baked export) for parity checks in app/src/StudioApp.tsx
- [x] T012 [US2] Execute deterministic pairwise parity comparisons with repeat-run stability checks in app/src/lib/pointerParity.ts
- [x] T013 [US2] Surface parity pass/fail with stage-specific mismatch details in app/src/StudioApp.tsx

**Checkpoint**: User Story 2 is independently functional.

---

## Phase 5: User Story 3 - Support Both Pointer Pack Modes (Priority: P2)

**Goal**: Source-based custom packs and legacy normalized packs both use identical effect controls and parity validation.

**Independent Test**: Apply identical effect values to one source-based custom pack and one legacy normalized pack; both pass preview/export parity checks.

### Implementation for User Story 3

- [x] T014 [US3] Add pointer pack source-type resolver (source-based custom vs legacy normalized) in app/src/lib/customHandStore.ts
- [x] T015 [US3] Route both pointer pack modes through the same pointer-effects application path in app/src/components/InteractiveCanvas.tsx
- [x] T016 [US3] Route both pointer pack modes through the same baked export parity path in app/src/StudioApp.tsx
- [x] T017 [US3] Handle missing pointer assets per stage without breaking unaffected pointers and include missing-asset details in parity output in app/src/StudioApp.tsx

**Checkpoint**: User Story 3 is independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final scope guardrails and regression safety for default behavior.

- [x] T018 [P] Add feature-scope guard comments and non-goal notes for 031-only behavior in app/src/lib/pointerEffects.ts
- [x] T019 Verify default-value baseline keeps existing rendering unchanged (no pointer effect edits) in app/src/components/InteractiveCanvas.tsx
- [x] T020 Validate no task touches legacy 030 backlog and record completion notes in app/specs/031-pointer-effects-parity-pipeline/checklists/requirements.md

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): Starts immediately.
- Foundational (Phase 2): Depends on Phase 1 and blocks all stories.
- User Story phases: Depend on Phase 2 completion.
- Polish (Phase 6): Depends on all selected user stories.

### User Story Dependencies

- US1 (P1): Starts after Phase 2; no dependency on other stories.
- US2 (P1): Starts after US1 implementation is available for stage snapshots.
- US3 (P2): Starts after US1 and US2 shared paths exist.

### Within Each User Story

- UI/controls before render-path integration.
- Render-path integration before export-path integration.
- Parity computation before parity reporting UI.

---

## Parallel Opportunities

- T005 can run in parallel with T006 after T004.
- In US1, T008 can run in parallel with T009 after T007.
- In US3, T015 can run in parallel with T016 after T014.
- T018 can run in parallel with T019 in Polish phase.

---

## Parallel Example: User Story 3

- Run T015 and T016 in parallel after T014 is complete.

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1.
2. Complete Phase 2.
3. Complete Phase 3 (US1).
4. Validate independent US1 test.

### Incremental Delivery

1. Ship US1 (pointer effect controls + persistence).
2. Add US2 parity enforcement and mismatch diagnostics.
3. Add US3 dual-pack parity support.
4. Finish Phase 6 regression/scope checks.

### Scope Guard

- This task list is strictly limited to pointer effects and parity pipeline behavior for spec 031.
- No tasks include reopening, refactoring, or completing legacy work from spec 030.
