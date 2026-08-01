# Spec 129 — RGBA Alpha Pipeline Boundary Diagnostics

**Feature Branch**: `[129-alpha-pipeline-boundary-diagnostics]`  
**Created**: 2026-07-29  
**Status**: Complete; official package boundary passed, firmware screenshot boundary blocked  
**Domain**: Zepp/ZPK system investigation  
**Scope**: Diagnostics and evidence only; no production alpha conversion

## Risk Flags

1. The successful binary-alpha weekday/month diagnostic proves a compatibility
   workaround, but does not by itself prove that Zepp lacks partial-alpha
   support.
2. PNG file hashes can change after harmless re-encoding; decoded RGBA equality
   is the authoritative pass/fail signal.
3. Canvas processing, image normalization, effects baking, switcher preparation,
   and ZPK packaging are separate paths and must not be treated as one renderer.
4. A global `alpha > 0 -> 255` transformation could damage text weight, masks,
   shadows, reflections, glows, icons, photographs, hands, and switcher frames.
5. An official Zepp package and a FlowVault package must use the exact same
   source bytes before firmware behavior can be compared honestly.

## Problem Statement

Partially transparent weekday/month antialiasing produced a pale offset artifact
on an Amazfit watch. A coverage-and-centroid-preserving binary-alpha diagnostic
removed the artifact. Separately, translucent reflection/luminance overlays were
reported as fully opaque on the watch.

Official Zepp documentation recommends RGBA PNG resources for `IMG`, so the
failure boundary remains unresolved:

```text
source PNG
  -> FlowVault preview
  -> FlowVault processing
  -> nested device.zip PNG
  -> Zepp resource compiler/decoder
  -> widget compositor
  -> firmware screenshot
```

## Goal

Determine, with reproducible measurements, whether partial alpha is:

1. Preserved or damaged by each FlowVault asset path.
2. Preserved or damaged during ZPK construction.
3. Rendered correctly through the official Zepp route.
4. Rendered differently by Zepp widget type or opacity mechanism.

No global alpha policy may be implemented until the boundary verdict is scored.

## Manual and Existing Evidence References

- Zepp `IMG` documentation: RGBA PNG is an intended resource input.
- Existing repository ZPK references:
  `app/zpk_reference.txt`, `app/zpk_old.txt`, `app/zpk_history.txt`.
- Spec 032 extracted device evidence, including historical
  `assets/trasparente.png`.
- Current FlowVault paths:
  `assetImageGenerator.ts`, `digitBitmapGeometry.ts`,
  `effectsBakeEngine.ts`, image-switcher preparation, `zpkBuilder.ts`.
- Confirmed binary-label diagnostic ZPK SHA-256:
  `31c8c10e066a3cbe00486bbd6f9d3240f99a2b60cd7aed939838965e75a190f7`.

## Hypotheses

### H1 — Source pass-through is damaged by FlowVault

Confirm when an untouched source asset enters a pass-through `IMG` route but its
decoded packaged RGBA pixels differ without a documented geometric
normalization requirement.

Refute when decoded packaged pixels are identical to the source.

### H2 — Canvas re-encoding changes alpha semantics

Confirm when a canvas round-trip changes expected alpha values, alpha-weighted
RGB, or premultiplication signatures beyond tolerance.

Refute when the decoded result composites equivalently over both black and white.

### H3 — A specific FlowVault generator damages alpha

Evaluate independently for:

- Static image
- Image switcher
- Week/month label
- Numeric glyph
- Icon/weather asset
- Effects/photo-edit output
- Hand/pointer bitmap

Confirm per route when divergence first appears in that route's generated PNG.

### H4 — ZPK packaging damages otherwise-correct PNG bytes or pixels

Confirm when the pre-package asset and extracted nested `device.zip` asset
differ unexpectedly.

Refute when bytes are identical for pass-through assets, or decoded RGBA is
identical for explicitly normalized assets.

### H5 — Zepp per-pixel alpha is defective while widget opacity works

Confirm when per-pixel alpha renders incorrectly in an official Zepp package but
an opaque PNG controlled by widget opacity renders correctly.

### H6 — Device/firmware does not provide usable translucency

Confirm only when the untouched official Zepp package and the FlowVault package
both preserve partial alpha in extracted assets, yet both render the same
incorrect result in firmware screenshots.

## Controlled Fixture

The reference fixture MUST contain:

- White, black, red, green, blue, and orange patches.
- Alpha levels: `0, 32, 64, 96, 128, 160, 192, 224, 255`.
- Sharp rectangles.
- One-pixel diagonals.
- Circles and curved text-like edges.
- A low-alpha white reflection gradient.
- Straight-alpha RGB samples.
- Deliberately premultiplied-RGB samples encoded with the same alpha.
- Fully transparent pixels with both zero RGB and nonzero RGB.
- Embedded fixture ID and machine-readable coordinate map.

The source fixture MUST be created once, hashed, and then treated as immutable.

## Package Matrix

| ID | Route | Required package |
|---|---|---|
| P0 | Source reference | Standalone PNG only |
| P1 | Canvas encode/decode | Standalone round-trip PNG |
| P2 | Static FlowVault `IMG` pass-through | FlowVault ZPK |
| P3 | Static `IMG` after normalization | FlowVault ZPK |
| P4 | Image switcher frame | FlowVault ZPK |
| P5 | Week/month label baker | FlowVault ZPK |
| P6 | Numeric glyph baker | FlowVault ZPK |
| P7 | Effects/photo-edit baker | FlowVault ZPK |
| P8 | Pointer/hand bitmap | FlowVault ZPK |
| P9 | Official Zepp untouched per-pixel-alpha IMG | Official package |
| P10 | Official Zepp opaque IMG + widget opacity | Official package |
| P11 | Binary-alpha compatibility control | FlowVault ZPK |

P9 and P10 MUST use the same fixture source used by P0. If the official tool
modifies resources, its compiled/extracted asset must be captured and measured.

## Measurements

For every source, generated, and extracted PNG:

- SHA-256 of encoded file.
- Width, height, PNG color type, bit depth, and palette/transparency metadata.
- Unique alpha values and count.
- Per-alpha pixel counts.
- Per-coordinate RGBA values from the fixture map.
- Decoded pixel mismatch count and maximum channel delta.
- Alpha-weighted centroid.
- Total alpha coverage.
- Composite result over black, white, and checker backgrounds.
- Straight/premultiplied-alpha anomaly indicators.
- Bounding box of nonzero alpha.

## Pass/Fail Gates

### G1 — Fixture integrity

- PASS: Exact dimensions, coordinate map, expected alpha set, and stable SHA.
- FAIL: Any missing alpha band, coordinate ambiguity, or fixture mutation.

### G2 — Pass-through preservation

- PASS: Packaged pass-through decoded RGBA equals source exactly.
- FAIL: Any unexplained decoded pixel difference.

### G3 — Normalized-route visual equivalence

- PASS: Dimensions match the documented target and composite error is at most
  one 8-bit channel level per pixel, unless the route documents another limit.
- FAIL: Unexpected alpha loss, clipping, RGB fringe, or larger error.

### G4 — Packaging preservation

- PASS: Pre-package and extracted asset bytes match for pass-through, or decoded
  RGBA matches for explicitly re-encoded normalization.
- FAIL: Packaging introduces an unexplained change.

### G5 — Generator isolation

- PASS: Every route has a recorded first-divergence boundary or confirmed
  preservation result.
- FAIL: A route is grouped with another without direct evidence.

### G6 — Official boundary

- PASS: P9 and P10 are built from the immutable fixture and their packaged
  resources are measured.
- BLOCKED: Official Zepp tooling cannot be executed or inspected in the current
  environment.
- FAIL: Package exists but source identity or measurements are missing.

### G7 — Firmware observation

- PASS: Watch screenshots are captured digitally for P9, P10, and the matching
  FlowVault control under the same face background and device settings.
- BLOCKED: No programmatic or connected-device capture path exists.
- FAIL: Images are camera photos only, use inconsistent backgrounds, or cannot
  be associated with package hashes.

### G8 — Root-cause verdict

- PASS: Evidence distinguishes FlowVault, Zepp compilation, per-pixel alpha,
  widget opacity, or firmware behavior.
- BLOCKED: G6 or G7 remains blocked.
- FAIL: A conclusion is issued despite an unresolved decisive boundary.

## Scoring

Total score: 100.

| Area | Points |
|---|---:|
| Immutable fixture and reference metrics | 10 |
| FlowVault route coverage | 30 |
| ZPK extraction and preservation evidence | 20 |
| Premultiplication/composite analysis | 10 |
| Official Zepp package boundary | 15 |
| Firmware screenshot boundary | 10 |
| Auditable verdict and recommendation | 5 |

Result bands:

- `90–100`: Conclusive.
- `75–89`: Strong but one non-decisive gap remains.
- `50–74`: Partial; no production-wide alpha policy authorized.
- `<50`: Insufficient.

Regardless of numeric score, G8 cannot pass when G6 or G7 is blocked.

## Required Evidence Structure

```text
app/specs/129-alpha-pipeline-boundary-diagnostics/
  spec.md
  plan.md
  tasks.md
  scorecard.md
  evidence/
    fixture/
    source-analysis/
    flowvault-routes/
    packages/
    extracted/
    official-zepp/
    firmware/
    reports/
```

Every generated artifact MUST include a manifest entry containing its fixture
SHA, route ID, generator commit, creation command, and result hash.

## Non-Goals

- Implementing a global binary-alpha finalizer.
- Changing existing preview behavior.
- Changing geometry, alignment, tabular layout, maximum-glyph sizing, or asset
  naming.
- Deploying production changes.
- Treating a successful workaround as proof of root cause.

## Acceptance Criteria

1. All P0–P8 and P11 machine-testable routes have reproducible evidence.
2. Every packaged asset is extracted from the nested device package and measured.
3. Byte equality and decoded-pixel equality are reported separately.
4. P9/P10 official-route status is explicitly pass, fail, or environment-blocked.
5. Firmware status is explicitly pass, fail, or environment-blocked.
6. The final scorecard does not overstate certainty.
7. Any proposed production fix is tied to the first measured divergence boundary.
