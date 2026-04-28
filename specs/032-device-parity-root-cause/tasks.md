# Tasks: Device Parity Root-Cause Investigation

**Input**: Design documents from `/app/specs/032-device-parity-root-cause/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

## Phase 1: Setup (Shared Investigation Scaffolding)

**Purpose**: Lock deterministic inputs and artifact locations before any run execution.

- [ ] T001 Define investigation artifact layout and naming convention in app/specs/032-device-parity-root-cause/investigation/README.md
- [ ] T002 Create deterministic fixture catalog (engrave complexity + pointer hand-pack permutations) in app/specs/032-device-parity-root-cause/investigation/fixtures.yaml
- [ ] T003 [P] Create run evidence template with mandatory stage fields in app/specs/032-device-parity-root-cause/investigation/templates/run-evidence-template.md
- [ ] T004 [P] Create on-device matrix template with all mandatory columns in app/specs/032-device-parity-root-cause/investigation/templates/device-matrix.csv
- [ ] T005 Add operator quickstart for capture-only mode and run bootstrap in app/specs/032-device-parity-root-cause/quickstart.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Prepare shared validators and hard gates that must pass before user-story completion.

**CRITICAL**: No story can be closed until this phase is complete.

- [ ] T006 Wire investigation scripts and commands for build/parity validators in app/package.json
- [ ] T007 [P] Validate run record contract compliance against schema in app/specs/032-device-parity-root-cause/contracts/investigation-run-record.schema.json
- [ ] T008 [P] Validate instrumentation event contract compliance against schema in app/specs/032-device-parity-root-cause/contracts/instrumentation-events.schema.json
- [ ] T009 [P] Validate evidence bundle contract compliance against schema in app/specs/032-device-parity-root-cause/contracts/evidence-pack-manifest.schema.json
- [ ] T010 [P] Verify instrumentation remains capture-only and output-semantic safe in app/scripts/checkInstrumentationNonIntrusive.mjs
- [ ] T011 Create/confirm ZPK parity validator for watchface/index.js and app.json checks in app/scripts/validateZpkParity.mjs
- [ ] T012 Create/confirm asset reference verifier for exported manifests in app/scripts/verifyAssetManifest.mjs
- [ ] T013 [P] Create/confirm quantitative run-minimum validator (engrave >=5, pointer >=10) in app/scripts/validateRunMinimums.mjs
- [ ] T014 [P] Create/confirm SC-001 matrix integrity validator (>=95% + mandatory fields + orphan check) in app/scripts/validateSc001MatrixIntegrity.mjs
- [ ] T015 [P] Create/confirm two-device-class coverage validator in app/scripts/validateTwoDeviceClassCoverage.mjs
- [ ] T016 Execute build gate (`npm run build`) and record result in app/specs/032-device-parity-root-cause/investigation/build-gate-report.md

**Checkpoint**: Setup/build/contracts/validators are in place and build gate has passed.

---

## Phase 3: User Story 1 - Reproduce Device vs Preview Mismatch (Priority: P1) 🎯 MVP

**Goal**: Reproduce both reported issues deterministically across preview, export, extraction, and device stages.

**Independent Test**: Repeat fixed fixtures for >=3 cycles and verify deterministic parity gate reports are complete and passing.

- [ ] T017 [US1] Freeze fixture execution order and run seed in app/specs/032-device-parity-root-cause/investigation/fixtures.yaml
- [ ] T018 [P] [US1] Capture preview evidence for all fixtures in app/specs/032-device-parity-root-cause/investigation/evidence/preview/
- [ ] T019 [P] [US1] Capture export evidence for the same fixture states in app/specs/032-device-parity-root-cause/investigation/evidence/export/
- [ ] T020 [US1] Run extraction checks per export and document watchface/index.js + app.json parity in app/specs/032-device-parity-root-cause/investigation/evidence/zpk-validation.md
- [ ] T021 [US1] Run asset-manifest verification and record reference/presence parity in app/specs/032-device-parity-root-cause/investigation/evidence/asset-manifest-report.md
- [ ] T022 [US1] Execute on-device runs across fresh/resume/repeated/time-transition conditions in app/specs/032-device-parity-root-cause/investigation/evidence/device/
- [ ] T023 [US1] Fill matrix rows for all executed runs in app/specs/032-device-parity-root-cause/investigation/device-matrix-filled.csv
- [ ] T024 [US1] Execute deterministic run-minimum gate and publish report in app/specs/032-device-parity-root-cause/investigation/run-minimums-report.md
- [ ] T025 [US1] Execute deterministic SC-001 matrix integrity gate and publish report in app/specs/032-device-parity-root-cause/investigation/sc001-matrix-integrity-report.md
- [ ] T026 [US1] Execute deterministic two-device-class coverage gate and publish report in app/specs/032-device-parity-root-cause/investigation/device-coverage-gate-report.md
- [ ] T027 [US1] Publish reproducibility classification (reproducible vs non-reproducible) for both issues in app/specs/032-device-parity-root-cause/investigation/repro-summary.md

**Checkpoint**: US1 closes only when deterministic parity gates (run minimums, SC-001, device coverage) are all passing.

---

## Phase 4: User Story 2 - Isolate Root-Cause Hypotheses with Measurable Tests (Priority: P1)

**Goal**: Execute measurable H1/H2 tests and produce evidence-backed outcomes.

**Independent Test**: Every hypothesis H1-1..H1-3 and H2-1..H2-3 has measured data, status, and evidence references.

- [ ] T028 [US2] Define measurable hypothesis execution matrix for H1/H2 in app/specs/032-device-parity-root-cause/investigation/hypothesis-matrix.md
- [ ] T029 [P] [US2] Implement/confirm engrave severity delta helper in app/scripts/measureEngraveDelta.mjs
- [ ] T030 [P] [US2] Implement/confirm pointer reliability aggregation helper in app/scripts/measurePointerReliability.mjs
- [ ] T031 [US2] Execute H1-1..H1-3 tests and capture outcomes in app/specs/032-device-parity-root-cause/investigation/hypothesis-results-issue1.md
- [ ] T032 [US2] Execute H2-1..H2-3 tests and capture outcomes in app/specs/032-device-parity-root-cause/investigation/hypothesis-results-issue2.md
- [ ] T033 [US2] Consolidate confirmed/refuted/inconclusive outcomes with evidence links in app/specs/032-device-parity-root-cause/investigation/hypothesis-verdicts.md

**Checkpoint**: US2 closes only when all hypotheses have measurable outcomes and status.

---

## Phase 5: User Story 3 - Produce Release-Safe Validation and Rollback Guidance (Priority: P2)

**Goal**: Produce auditable parity verdicts, risk ratings, rollback triggers, and release guidance.

**Independent Test**: One reviewer can verify complete evidence pack, gate statuses, and actionable rollback/go-no-go guidance.

- [ ] T034 [US3] Build evidence completeness audit across required artifacts in app/specs/032-device-parity-root-cause/investigation/evidence-audit.md
- [ ] T035 [US3] Produce stage-specific parity verdicts for engrave and pointer in app/specs/032-device-parity-root-cause/investigation/parity-verdict.md
- [ ] T036 [US3] Define risk ratings and rollback triggers/actions tied to observed failures in app/specs/032-device-parity-root-cause/investigation/rollback-and-risk.md
- [ ] T037 [US3] Publish release readiness recommendation (go/no-go/containment) in app/specs/032-device-parity-root-cause/investigation/release-readiness.md
- [ ] T038 [US3] Build evidence pack manifest with AG gate statuses in app/specs/032-device-parity-root-cause/investigation/evidence-pack-manifest.json

**Checkpoint**: US3 closes only when AG gates, parity verdicts, and rollback actions are complete and reviewable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, deployment sync safety checks, and traceability closure.

- [ ] T039 [P] Run independent operator replay and document reproducibility drift in app/specs/032-device-parity-root-cause/investigation/replay-validation.md
- [ ] T040 Reconcile missing artifacts and fix evidence gaps in app/specs/032-device-parity-root-cause/investigation/
- [ ] T041 Execute deploy sync check for docs and docs/studio hash parity in app/specs/032-device-parity-root-cause/investigation/deploy-sync-report.md
- [ ] T042 Verify docs/index.html and docs/studio/index.html reference current docs/assets build outputs in app/specs/032-device-parity-root-cause/investigation/deploy-sync-report.md
- [ ] T043 Remove stale hashed assets not referenced by current docs indexes and record cleanup in app/specs/032-device-parity-root-cause/investigation/deploy-sync-report.md
- [ ] T044 Run scope-conformance check against FR-012/non-goals in app/specs/032-device-parity-root-cause/investigation/scope-conformance-check.md
- [ ] T045 Update final traceability checklist with links to all outputs in app/specs/032-device-parity-root-cause/checklists/requirements.md

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5 -> Phase 6.
- Phase 2 build gate (T016) is a hard blocker for Phase 3+ completion.
- Deterministic parity gates (T024, T025, T026) are hard blockers from US1 to US2.
- Evidence pack manifest completion (T038) is a blocker before deploy sync checks (T041-T043).

### User Story Dependencies

- US1 depends on foundational validators and build gate from Phase 2.
- US2 depends on US1 reproducibility outputs and deterministic gate pass reports.
- US3 depends on US2 measurable hypothesis verdict completion.

### Dependency Graph

- US1 (P1) -> US2 (P1) -> US3 (P2)

### Parallel Opportunities

- Phase 1: T003 and T004 in parallel after T001/T002.
- Phase 2: T007/T008/T009/T010 in parallel after T006.
- Phase 2: T013/T014/T015 in parallel after T011/T012.
- US1: T018 and T019 in parallel after T017.
- US2: T029 and T030 in parallel after T028.
- Phase 6: T041 and T042 in parallel after T038.

---

## Parallel Example: User Story 1

```text
Run together after T017:
- T018 [US1] preview evidence capture
- T019 [US1] export evidence capture
```

## Parallel Example: User Story 2

```text
Run together after T028:
- T029 [US2] engrave severity helper
- T030 [US2] pointer reliability helper
```

## Parallel Example: User Story 3

```text
Run together after T034:
- T035 [US3] parity verdict write-up
- T036 [US3] rollback/risk write-up
```

---

## Implementation Strategy

### MVP First (US1)

1. Finish Phase 1 and Phase 2.
2. Execute US1 through deterministic parity gates (T024-T026).
3. Validate reproducibility output before hypothesis work.

### Incremental Delivery

1. Deliver deterministic reproduction and parity gate package (US1).
2. Deliver measurable root-cause hypothesis outcomes (US2).
3. Deliver release-safe verdict and rollback package (US3).
4. Finish deploy-sync checks for docs/docs/studio and final traceability (Phase 6).
