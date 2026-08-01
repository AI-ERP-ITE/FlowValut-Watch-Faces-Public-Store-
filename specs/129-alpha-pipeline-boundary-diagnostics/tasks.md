# Spec 129 — Dependency-Ordered Tasks

## Documentation and baseline

- [x] T000 Create Spec 129, plan, tasks, and initial scorecard.
- [x] T001 Audit current alpha-related source routes and historical ZPK evidence.
- [x] T002 Record Zepp manual/documentation claims and their exact evidentiary
  limits.

## Fixture and tooling

- [x] T010 Generate immutable RGBA alpha fixture and coordinate manifest.
- [x] T011 Implement PNG metadata/RGBA/composite inspection harness.
- [x] T012 Validate fixture alpha bands, dimensions, hashes, and reference
  composites.

## FlowVault route tests

- [x] T020 Test canvas encode/decode round-trip.
- [x] T021 Test untouched static image pass-through.
- [x] T022 Test static image normalization path.
- [x] T023 Test image-switcher frame path.
- [x] T024 Test week/month label path.
- [x] T025 Test numeric glyph path.
- [x] T026 Test icon/weather path.
- [x] T027 Test effects/photo-edit path.
- [x] T028 Test pointer/hand path.
- [x] T029 Revalidate binary-alpha compatibility control measurements.

## ZPK boundary

- [x] T030 Build diagnostic FlowVault packages.
- [x] T031 Extract outer packages and nested `device.zip` payloads.
- [x] T032 Compare pre-package and extracted encoded bytes.
- [x] T033 Compare decoded RGBA pixels, metadata, alpha coverage, centroid, and
  composites.
- [x] T034 Validate `watchface/index.js`, `app.json`, asset references, geometry,
  and route isolation.

## Official Zepp boundary

- [x] T040 Discover installed/automatable official Zepp tooling.
- [x] T041 Build official untouched per-pixel-alpha package.
- [x] T042 Build official opaque-image plus widget-opacity package.
- [x] T043 Extract and measure official packaged resources.

## Firmware boundary

- [x] T050 Create isolated installable packages and QR codes. **MIXED:** four
  local controls ready; authenticated install QR generation blocked.
- [x] T051 Validate hosted bytes against local hashes. **BLOCKED:** configured
  private GitHub token returned HTTP 401 before any upload.
- [x] T052 Capture digital firmware screenshots for official and FlowVault
  controls.
  **BLOCKED:** Zeus logged out; no simulator or Developer Bridge connected.
- [x] T053 Measure screenshot regions against expected composites.
  **BLOCKED:** no hash-associated P9/P10 screenshots exist.

## Verdict

- [x] T060 Complete per-hypothesis confirm/refute/inconclusive table.
- [x] T061 Calculate pass/fail gates and weighted score.
- [x] T062 Identify the first divergence boundary.
- [x] T063 Propose the minimum production fix and regression suite.
- [x] T064 Close the spec with final evidence manifest.
