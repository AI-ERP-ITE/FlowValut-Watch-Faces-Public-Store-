# Specification 124: System B Editable Watchfaces

## Status

Current-state V2-only specification. System A is read-only.

## Objective

Create a standalone FlowVault application called **System B — Editable Watchfaces**. It imports multiple ordinary FVWF V1 projects, lets the designer define controlled Zepp-editable component groups, and exports an editable V2 ZPK plus a portable `.fvwc` authoring project.

System B starts from exact copies of current System A modules that must change. It does not extend, refactor, restore, or modify System A.

## Application boundary

System B will live under:

```text
app/system-b-editable/
```

It owns its package, entry point, TypeScript configuration, Vite configuration, tests, and build output.

Local URL:

```text
http://localhost:5184/editable-watchfaces/
```

Production URL:

```text
https://ai-erp-ite.github.io/Watch-Faces/editable-watchfaces/
```

## AOD policy

Official Zepp OS editable-pointer guidance reads the saved editable configuration in AOD and
suppresses the second hand there. System B therefore supports a selected theme following into
AOD only when every variant source contains a dedicated AOD layout. If any variant lacks a
dedicated AOD layout, the slot exports with the base build's fixed AOD.

## Workshop, Admin, and QR

Editable export reuses the private Workshop pipeline:

1. Build and archive-verify the editable V2 ZPK.
2. Save the serialized FVWC source, exact ZPK, main preview, AOD preview, and installation QR
   as one Workshop build.
3. Generate the QR only from the backend-provided hosted install URL.
4. Expose the QR and a link to the existing private Admin page after finalization.
5. If authentication/backend upload fails, preserve the local ZPK download and report that QR
   and Admin handoff are unavailable.

## Current authoritative baseline

- Generator: `app/src/lib/jsCodeGenerator.ts`
- Generator output: `configVersion: "v2"`
- Normal manifest: `editable: 0`
- Packager: `app/src/lib/zpkBuilder.ts`
- FVWF parser/writer: `projectFileArtifact.ts` and `projectFileConfig.ts`
- Canvas: `InteractiveCanvas.tsx`
- Model resolution: `watchModelTarget.ts`
- V3 logic is out of scope and must not be searched for, restored, copied, or recreated.

## Selective copy rule

Copy a current System A module when:

1. System B requires its existing behavior; and
2. System B must change or allow that behavior to diverge.

Copy the module exactly before changing the System B copy. Generic dependencies may remain external third-party dependencies. Existing FlowVault business modules may not remain live dependencies unless explicitly classified as neutral and approved.

## Source projects

- Accept multiple FVWF V1 files.
- Parse through the copied current parser.
- Validate and canonicalize each stored watch model through copied current model-target resolution.
- Store immutable source snapshots with stable IDs and hashes.
- Reject malformed, unresolved-model, or incompatible source projects.
- Detect duplicates.
- Never overwrite the imported source.

## FVWC

`.fvwc` is a System B-only authoring format with `fvwcSchemaVersion: 1`.

It contains:

- Immutable source-project snapshots.
- Portable source assets.
- Base-build selection.
- Component groups.
- Editable slots.
- Variants and defaults.
- Data bindings.
- Ownership.
- V2 capability profile.
- AOD policy.
- Deterministic runtime mappings.

Object URLs and browser `File` identities are caches, not persistent project data.

## Composer model

```text
Source Build
→ Source Layer
→ Component
→ Component Group
→ Editable Slot
→ Complete Variant
```

The final runtime model never exposes arbitrary independent layer swapping.

## Editable modes

- `DATA_ONLY`
- `STYLE_ONLY`
- `STYLE_AND_DATA`

Every mode compiles to a complete Zepp-selectable runtime branch.

## Initial V2 export

The first vertical slice supports:

- One approved V2 watch model.
- One editable slot.
- Two or three complete numeric/image-level variants.
- `WATCHFACE_EDIT_GROUP`.
- Deterministic `edit_id`.
- `CURRENT_TYPE`.
- Required `ONLY_EDIT` masks.
- `editable: 1` only in System B editable output.
- `HIDDEN_IN_AOD` or `FIXED_AOD`.

Deferred:

- Multiple slots.
- Editable pointers.
- Editable backgrounds.
- Variant-specific AOD.
- Additional devices.

## Completion criteria

1. System A files remain unchanged.
2. System B runs at its standalone local URL.
3. Current FVWF V1 projects load with current model validation.
4. System B’s copied normal path passes semantic parity.
5. Multiple immutable builds can be compared and grouped.
6. FVWC saves and reopens losslessly.
7. One editable V2 slot compiles and packages.
8. The generated editable face works on the approved physical device.

