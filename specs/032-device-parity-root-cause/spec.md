# Feature Specification: Device Parity Root-Cause Investigation

**Feature Branch**: `[032-device-parity-root-cause]`  
**Created**: 2026-04-22  
**Status**: Draft  
**Input**: User description: "Investigation and root-cause analysis for engrave-frame heaviness on device and unreliable TIME_POINTER hand-pack rendering"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reproduce Device vs Preview Mismatch (Priority: P1)

As a quality engineer, I can reproduce both production issues with deterministic steps so investigation outcomes are based on repeatable evidence instead of one-off observations.

**Why this priority**: Reliable reproduction is the critical first gate for root-cause isolation and prevents false conclusions.

**Independent Test**: Can be fully tested by running the same fixtures through preview, export, and device verification multiple times and confirming whether outcomes are repeatable.

**Acceptance Scenarios**:

1. **Given** a fixture that previously showed heavier engrave effect on device, **When** the fixture is run through preview, exported package, and on-device check using the same protocol, **Then** differences are captured with reproducible evidence and repeat-run consistency.
2. **Given** a fixture that previously showed pointer hand-pack rendering instability, **When** the same fixture is deployed and observed across repeated device launches, **Then** pass/fail behavior is recorded with frequency and stage-specific evidence.

---

### User Story 2 - Isolate Root-Cause Hypotheses with Measurable Tests (Priority: P1)

As a maintainer, I can evaluate explicit hypotheses for each issue using measurable confirmation/refutation tests so decisions are evidence-based and auditable.

**Why this priority**: Without structured hypothesis testing, fixes may target symptoms and regress later.

**Independent Test**: Can be fully tested by executing each hypothesis test case, capturing expected vs actual outcomes, and marking each hypothesis as confirmed, refuted, or inconclusive.

**Acceptance Scenarios**:

1. **Given** a defined hypothesis for the engrave mismatch, **When** its measurable test is executed, **Then** the result determines confirmation, refutation, or inconclusive status.
2. **Given** a defined hypothesis for pointer rendering reliability, **When** repeated on-device runs are completed per matrix, **Then** reproducibility and stability metrics are produced.

---

### User Story 3 - Produce Release-Safe Validation and Rollback Guidance (Priority: P2)

As a release owner, I can review a complete validation package and rollback criteria so parity decisions can be made safely before shipping additional changes.

**Why this priority**: Production parity issues require clear go/no-go evidence and rollback safeguards.

**Independent Test**: Can be fully tested by reviewing one completed investigation bundle and verifying all required artifacts, risk ratings, and rollback triggers are present.

**Acceptance Scenarios**:

1. **Given** investigation execution is complete, **When** evidence artifacts are reviewed, **Then** required screenshots, extracted package checks, manifest checks, and matrix results are all present.
2. **Given** unresolved or high-risk findings remain, **When** release readiness is assessed, **Then** rollback triggers and containment guidance are explicitly available.

### Edge Cases

- Device behavior is intermittent and only fails after multiple launches or time transitions.
- Preview and exported package appear consistent, but device output diverges only on specific hardware models.
- Pointer pack partially renders (for example, only one or two hands visible) while preview still shows all layers.
- Engrave mismatch severity varies by asset density, scale, or contrast level.
- A test run cannot be completed due to missing evidence artifact; the run must be invalidated and repeated.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The investigation process MUST define reproducible diagnostic workflows that compare preview, exported package, and on-device rendering for both reported issues.
- **FR-002**: The investigation process MUST include instrumentation points that capture stage-specific state needed to isolate where divergence begins.
- **FR-003**: The investigation process MUST define a deterministic validation protocol that can be repeated by different team members with equivalent outcomes.
- **FR-004**: The investigation process MUST require explicit evidence artifacts for every run, including before/after screenshots for each stage.
- **FR-005**: The investigation process MUST require extracted package validation of `watchface/index.js` and `app.json` for each tested build.
- **FR-006**: The investigation process MUST require asset-manifest verification that confirms referenced assets, naming, and expected presence for pointer and engrave-related outputs.
- **FR-007**: The investigation process MUST define an on-device test matrix covering multiple runs and relevant watch/device conditions.
- **FR-008**: The investigation process MUST include hypothesis-driven tests for Issue 1 (engrave heaviness) with measurable criteria for confirm/refute outcomes.
- **FR-009**: The investigation process MUST include hypothesis-driven tests for Issue 2 (TIME_POINTER hand-pack reliability) with measurable criteria for confirm/refute outcomes.
- **FR-010**: The investigation process MUST produce a parity verdict that explicitly states pass/fail per issue across preview, export, and device stages.
- **FR-011**: The investigation process MUST include rollback triggers, rollback steps, and risk ratings for inconclusive or failing parity outcomes.
- **FR-012**: Investigation scope MUST remain limited to diagnostics, root-cause analysis, validation protocol, and parity acceptance criteria.

### Acceptance Criteria

- **AC-001**: Both issues are reproducible or explicitly classified as non-reproducible with documented attempt history and run counts.
- **AC-002**: Every hypothesis has a measurable test definition and a recorded outcome status (confirmed, refuted, or inconclusive).
- **AC-003**: Every test run includes complete evidence artifacts: screenshots, extracted package checks, manifest checks, and matrix row entries.
- **AC-004**: A parity verdict is produced separately for Issue 1 and Issue 2 with stage-level reasoning.
- **AC-005**: Rollback criteria are actionable and tied to concrete failure signals observed in validation.

### Validation Protocol

1. Select fixed fixtures for engrave-frame and TIME_POINTER scenarios.
2. Capture baseline preview screenshots before any investigation action.
3. Generate export package from the same fixture state and capture export-stage screenshots.
4. Extract package contents and validate `watchface/index.js` plus `app.json` against expected parity assumptions.
5. Validate asset manifest consistency against exported references and available files.
6. Deploy to device and execute repeated runs per on-device matrix conditions.
7. Capture on-device screenshots/videos for each matrix row and annotate observed outcomes.
8. Compare preview, export, and device outcomes using predefined measurable criteria.
9. Record hypothesis outcomes, parity verdicts, risks, and rollback recommendation.

### Required Evidence Artifacts

- Before/after screenshots for preview stage.
- Before/after screenshots for exported package validation stage.
- Before/after screenshots for on-device stage.
- Extracted package snapshot containing `watchface/index.js` and `app.json` checks.
- Asset manifest verification report covering expected references and actual asset presence.
- Completed on-device test matrix with run counts, pass/fail, and notes.
- Hypothesis test log with measurements and verdict per hypothesis.

### Issue 1 Hypotheses - Engrave Frame Heaviness on Device

- **H1-1**: Device render output applies stronger visual layering than preview/export for the same effect settings.
  - **Test**: Compare measured edge-density/coverage delta between preview/export captures and device captures for identical fixture states across at least 5 runs.
  - **Confirm if**: Device delta exceeds agreed tolerance in at least 4 of 5 runs.
  - **Refute if**: Device delta remains within tolerance in at least 4 of 5 runs.
- **H1-2**: Engrave heaviness increases with specific asset contrast/complexity profiles.
  - **Test**: Run low/medium/high complexity fixtures and measure mismatch frequency and severity per class.
  - **Confirm if**: High-complexity class shows materially higher mismatch rate than low-complexity class.
  - **Refute if**: Mismatch rate does not vary meaningfully by complexity class.
- **H1-3**: Mismatch is device-condition dependent (launch state, repeated resume, or runtime cycle effects).
  - **Test**: Execute repeated launches/resumes per matrix and measure heaviness variance by condition.
  - **Confirm if**: One or more conditions repeatedly produce higher severity than baseline condition.
  - **Refute if**: Severity remains stable across all tested conditions.

### Issue 2 Hypotheses - TIME_POINTER Hand-Pack Reliability on Device

- **H2-1**: Pointer hand-pack references are intermittently unavailable on device despite valid preview state.
  - **Test**: For each run, validate extracted references and compare against on-device rendered hand presence.
  - **Confirm if**: Missing/partial device rendering occurs while references remain valid in extraction for repeated runs.
  - **Refute if**: Rendering failures always coincide with invalid or missing extracted references.
- **H2-2**: Reliability failure is tied to specific hand-pack composition patterns (hour/minute/second/cover combinations).
  - **Test**: Execute matrix permutations of hand-pack compositions and track per-permutation failure rate across at least 10 runs each.
  - **Confirm if**: One or more composition patterns exceed predefined failure-rate threshold while others remain stable.
  - **Refute if**: Failure rate is uniform and low across all tested compositions.
- **H2-3**: Device runtime transitions (startup/resume/time progression) trigger pointer disappearance despite stable initial render.
  - **Test**: Observe pointer visibility at startup, after resume, and after controlled time transitions in each matrix run.
  - **Confirm if**: Disappearance clusters around specific runtime transitions with repeatable frequency.
  - **Refute if**: Visibility remains stable across transitions.

### On-Device Test Matrix (Required Dimensions)

- Device model/class
- Firmware/runtime version
- Fixture ID
- Issue focus (engrave or pointer)
- Run index and total run count
- Launch condition (fresh launch/resume/repeated cycle)
- Observed result (pass/fail/partial)
- Evidence links/identifiers
- Notes and anomaly tags

### Non-Goals

- Broad UI redesign of editor, preview, or studio surfaces.
- Unrelated pipeline refactor outside investigation and root-cause needs.
- New end-user feature expansion not required for diagnostics and parity validation.
- Performance optimization work not directly tied to the two targeted production issues.

### Rollback and Risk

- **Rollback Trigger R1**: Investigation changes cause reduced reliability in previously stable parity flows.
  - **Rollback Action**: Revert investigation-specific behavioral toggles and restore last known stable validation baseline.
- **Rollback Trigger R2**: New diagnostics materially alter exported output instead of observing it.
  - **Rollback Action**: Disable intrusive diagnostics and repeat validation with non-intrusive capture-only mode.
- **Risk K1**: False positives from inconsistent capture conditions across stages.
  - **Mitigation**: Enforce fixed capture protocol and minimum repeated-run counts.
- **Risk K2**: Inconclusive findings due to sparse matrix coverage.
  - **Mitigation**: Require minimum matrix completion threshold before issuing parity verdict.
- **Risk K3**: Scope creep into redesign/refactor during investigation.
  - **Mitigation**: Enforce non-goals and require explicit approval for out-of-scope work.

### Key Entities *(include if feature involves data)*

- **Investigation Run Record**: One complete execution instance containing fixture, stage outputs, measurements, and verdict data.
- **Hypothesis Test Case**: A measurable test definition tied to one hypothesis with explicit confirm/refute criteria.
- **Evidence Bundle**: Collected screenshots, extraction checks, manifest report, and matrix records required for auditability.
- **Parity Verdict**: Final pass/fail/inconclusive outcome per issue with stage-specific rationale and risk notes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 95% of planned matrix rows are completed with full evidence artifacts and no missing mandatory fields.
- **SC-002**: 100% of defined hypotheses have recorded outcomes with measurable data attached.
- **SC-003**: Reproduction confidence is established by achieving the same observed behavior in at least 3 repeated runs for each issue when reproducible.
- **SC-004**: A stage-specific parity verdict is delivered for both issues with clear go/no-go recommendation.
- **SC-005**: Rollback triggers and actions are documented and actionable for all high-risk or inconclusive outcomes.

## Assumptions

- Representative device coverage is available for at least one primary target model and one secondary model/class.
- Investigation teams can capture and store visual evidence consistently across preview, export, and device stages.
- Export package extraction is available during investigation runs for validating `watchface/index.js`, `app.json`, and asset references.
- This specification governs investigation and validation only, and does not authorize broad redesign or unrelated pipeline restructuring.
