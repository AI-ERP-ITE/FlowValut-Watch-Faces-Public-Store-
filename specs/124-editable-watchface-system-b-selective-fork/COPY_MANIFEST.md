# Current-State V2 Copy Manifest

No implementation copies have been made.

## Copy: authoring and domain

| Current source | System B destination class | Reason to copy/adapt |
|---|---|---|
| `src/types/index.ts` | `src/system-a-baseline/types/` | Current watchface element/config contract; composer adds separate types |
| `src/lib/projectFileArtifact.ts` | `src/system-a-baseline/fvwf/` | Proven FVWF V1 import/export starting point |
| `src/lib/projectFileConfig.ts` | `src/system-a-baseline/fvwf/` | Proven editor/AOD serialization |
| Relevant FVWF tests | `tests/system-a-baseline/fvwf/` | Establish exact behavior |
| `src/lib/watchModelTarget.ts` | `src/system-a-baseline/models/` | Current authoritative model canonicalization |

## Copy: canvas and editing

| Current source | System B destination class | Reason to copy/adapt |
|---|---|---|
| `src/components/InteractiveCanvas.tsx` | `src/system-a-baseline/canvas/` | Must evolve to multiple builds, overlays, groups, slots, variants |
| `src/components/ElementList.tsx` | `src/system-a-baseline/components/` | Must become build/group/ownership aware |
| `src/components/PropertyPanel.tsx` | `src/system-a-baseline/components/` | Must edit build/group/slot/variant contexts |
| `src/components/BackgroundCropTool.tsx` | `src/system-a-baseline/components/` | Preserve background preparation |
| `src/components/BackgroundPhotoEditor.tsx` | `src/system-a-baseline/components/` | Preserve background editing |
| Required `AppContext.tsx` state/reducer behavior | `src/system-a-baseline/state/` | Establish normal parity before separate composer state |

Canvas dependencies will be transitively classified before copying. Expected copied candidates include icon/font/hand/weather rendering, pointer/effect normalization, gauge rendering, digit layout, date modes, photo editing, and flicker analysis.

## Copy: V2 generation and packaging

| Current source | System B destination class | Reason to copy/adapt |
|---|---|---|
| `src/lib/jsCodeGenerator.ts` | `src/system-a-baseline/generation/normalV2Generator.ts` | Current authoritative V2 baseline; editable generator derives in System B |
| `src/lib/zpkBuilder.ts` | `src/system-a-baseline/zpk/` | Proven packaging and asset normalization |
| `src/lib/qrGenerator.ts` | `src/system-a-baseline/qr/` | Proven QR behavior |
| Required generator dependencies | Matching System B folders | Output behavior may diverge |

Required generator dependencies currently include:

- `projectRasterGeometry.ts`
- `fontLibrary.ts`
- `gaugePointerDefaults.ts`
- `elementDataRules.ts`
- `effectNormalization.ts`
- `digitAlignment.ts`
- `timeDigitGeometry.ts`
- `dateImageMode.ts`
- `projectCanvasGeometry.ts`

## Copy from the current Studio container

Do not copy `StudioApp.tsx` as a whole. Copy the exact required algorithm blocks into provenance-recorded System B modules because the container also contains excluded workflows.

Required creation/export behavior includes:

- FVWF load orchestration and model-validation behavior.
- Background/project resolution handling.
- Pointer geometry/effect preparation.
- Digit bitmap generation/layout.
- Icon and photo-effect baking.
- Gauge detection/rendering.
- Engrave/frame rendering.
- Element asset/data-URL resolution.
- AOD asset preparation.
- Final normal V2 build orchestration.

Each extracted block must retain an original path, original line/commit reference, and baseline test before adaptation.

## New System B modules

These are not copies:

- Standalone application entry and layout.
- Multiple-source state.
- FVWC schema.
- Source hashing and asset persistence.
- Comparison canvas orchestration.
- Groups, slots, ownership, and variants.
- V2 editable capability profiles.
- Editable plan compiler.
- Editable V2 generator.
- Editable validator.

## Excluded

- V3 generation, routing, profiles, metadata, and tests.
- `StudioApp.tsx` as a complete application.
- Existing app router and entry.
- Admin and publishing.
- Workshop management.
- Storefront and catalog.
- Firebase mutation APIs.
- AI pipeline.
- Labs and Lab sync.
- Checkout and customer workflows.

## Shared dependencies

Only third-party packages and explicitly approved neutral primitives may remain shared. System B will own copies of FlowVault modules whenever their behavior must diverge.

## Pre-copy approval gate

Before Phase 2:

1. Approve this boundary.
2. Expand and classify every transitive local import.
3. Record hashes.
4. Confirm all destinations are under `app/system-b-editable/`.
5. Confirm no existing configuration or router edit is required.

