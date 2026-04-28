# Data Model: Pointer Bake Parity and Export Sizing Safety

## Entity: FixtureProfile

- Purpose: Frozen fixture metadata used to reproduce pointer parity and sizing behavior.
- Fields:
  - fixtureId (string, required, unique)
  - issueFocus (enum: pointer | engrave | both, required)
  - handPackPattern (string, required when issueFocus includes pointer)
  - complexityClass (enum: low | medium | high, optional for engrave correlation)
  - sourceConfigRef (string, required)
  - createdAt (ISO-8601 datetime, required)
- Validation Rules:
  - `fixtureId` must be reused across reruns for the same scenario.
  - pointer-focused fixtures must include `handPackPattern`.

## Entity: InvestigationRunRecord

- Purpose: One full preview->export->device execution bound to a single build hash.
- Fields:
  - runId (string, required, unique)
  - featureId (const: 032-device-parity-root-cause)
  - fixtureId (string, required, FK -> FixtureProfile.fixtureId)
  - buildHash (string, required)
  - operator (string, required)
  - startedAt (ISO-8601 datetime, required)
  - completedAt (ISO-8601 datetime, optional)
  - runStatus (enum: in_progress | completed | invalidated, required)
  - invalidationReason (string, optional)
- Validation Rules:
  - `completedAt` required when runStatus is `completed`.
  - `invalidationReason` required when runStatus is `invalidated`.

## Entity: PointerBakeSnapshot

- Purpose: Stage image snapshot used in pointer parity checks.
- Fields:
  - runId (string, required, FK -> InvestigationRunRecord.runId)
  - stage (enum: composer-preview | adjustment-preview | baked-export, required)
  - width (integer, required)
  - height (integer, required)
  - evidenceRefId (string, required)
  - capturedAt (ISO-8601 datetime, required)
- Validation Rules:
  - exactly one snapshot per stage per run is required for parity verdict.
  - stage dimensions must be > 0 and stable within same run.

## Entity: ExportSizingRecord

- Purpose: Measured sizing and pivot data for each exported pointer layer.
- Fields:
  - runId (string, required, FK -> InvestigationRunRecord.runId)
  - layer (enum: hour | minute | second | cover, required)
  - sourceWidth (number, required)
  - sourceHeight (number, required)
  - targetWidth (number, required)
  - targetHeight (number, required)
  - pivotX (number, required for hour/minute/second)
  - pivotY (number, required for hour/minute/second)
  - offsetX (number, optional)
  - offsetY (number, optional)
  - outputAssetName (string, required)
- Validation Rules:
  - hand layers must map to expected asset names (`hour_hand.png`, `minute_hand.png`, `second_hand.png`).
  - `targetWidth/targetHeight` must match layer export profile for current pipeline mode.

## Entity: PointerAssetManifestCheck

- Purpose: Validation that generator references and exported files are aligned.
- Fields:
  - runId (string, required, FK -> InvestigationRunRecord.runId)
  - referencedAssets (array<string>, required)
  - exportedAssets (array<string>, required)
  - missingAssets (array<string>, required)
  - checkedAt (ISO-8601 datetime, required)
- Validation Rules:
  - `missingAssets` must be empty for pass.
  - if `hideSeconds` is true, second hand reference may be absent by design.

## Entity: ParityComparison

- Purpose: Deterministic mismatch metrics for stage-pair comparison.
- Fields:
  - runId (string, required, FK -> InvestigationRunRecord.runId)
  - leftStage (enum: composer-preview | adjustment-preview | baked-export, required)
  - rightStage (enum: composer-preview | adjustment-preview | baked-export, required)
  - mismatchRatio (number, required)
  - maxChannelDelta (number, required)
  - pass (boolean, required)
- Validation Rules:
  - pass = mismatchRatio <= configured tolerance (default 0.015).
  - any deterministic drift across repeated comparison pass marks comparison fail.

## Entity: ParityVerdict

- Purpose: Final decision for release safety of pointer bake parity and export sizing.
- Fields:
  - verdictId (string, required, unique)
  - runId (string, required, FK -> InvestigationRunRecord.runId)
  - pointerParityStatus (enum: pass | fail | inconclusive, required)
  - exportSizingStatus (enum: pass | fail | inconclusive, required)
  - deviceParityStatus (enum: pass | fail | inconclusive, required)
  - riskRating (enum: low | medium | high, required)
  - rollbackRequired (boolean, required)
  - rationale (string, required)
- Validation Rules:
  - any fail/inconclusive in pointerParityStatus or exportSizingStatus requires explicit rationale.
  - `rollbackRequired` must be true when riskRating is high.

## Relationships

- FixtureProfile 1..* InvestigationRunRecord
- InvestigationRunRecord 1..* PointerBakeSnapshot
- InvestigationRunRecord 1..* ExportSizingRecord
- InvestigationRunRecord 1..1 PointerAssetManifestCheck
- InvestigationRunRecord 1..* ParityComparison
- InvestigationRunRecord 1..1 ParityVerdict

## State Transitions

InvestigationRunRecord.runStatus:
- in_progress -> completed
- in_progress -> invalidated

ParityVerdict statuses:
- inconclusive -> pass
- inconclusive -> fail
- pass/fail -> inconclusive (requires reopened investigation note)
