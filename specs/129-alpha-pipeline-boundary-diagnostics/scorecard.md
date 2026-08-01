# Spec 129 — Alpha Pipeline Diagnostic Scorecard

**Current status**: Complete with external firmware boundary blocked  
**Final score**: 90 / 100  
**Mandatory verdict gate G8**: BLOCKED by G7; numeric score is not a conclusive verdict

## Weighted Areas

| Area | Max | Earned | Status | Evidence |
|---|---:|---:|---|---|
| Immutable fixture and reference metrics | 10 | 10 | PASS | T010 fixture + T012 independent validation |
| FlowVault route coverage | 30 | 30 | PASS | T020–T029 all planned FlowVault/control routes executed |
| ZPK extraction and preservation | 20 | 20 | PASS | T031 extraction + T032 byte identity + T033 decoded/composite identity |
| Premultiplication/composite analysis | 10 | 10 | PASS | T027 validates preserved, scaled, and generated alpha classes |
| Official Zepp package boundary | 15 | 15 | PASS | Official Zeus P9/P10 builds extracted and compiled SOMH resources measured |
| Firmware screenshot boundary | 10 | 0 | BLOCKED | No Zepp login, simulator/bridge, or hash-associated P9/P10 screenshots |
| Auditable verdict and recommendation | 5 | 5 | PASS | T060–T064 final matrix, boundary map, proposal, and manifest |

## Mandatory Gates

| Gate | Status | Notes |
|---|---|---|
| G1 Fixture integrity | PASS | T010/T012 immutable fixture and reference composites |
| G2 Pass-through preservation | PASS | T021 route bytes and T032 independently extracted package bytes exact |
| G3 Normalized visual equivalence | PASS | T020/T022/T023 route checks and T033 package composites pass |
| G4 Packaging preservation | PASS | 36/36 encoded and decoded PNGs exact, including all alpha and composite metrics |
| G5 Generator isolation | PASS | T020–T029 independently classify every planned FlowVault/control route |
| G6 Official boundary | PASS | P9/P10 built by Zeus 1.9.3; official compiled resources extracted and measured |
| G7 Firmware observation | BLOCKED | Official CLI logged out; simulator and bridge disconnected; exact screenshots unavailable |
| G8 Root-cause verdict | BLOCKED | G7 is mandatory; findings are strong but not firmware-conclusive |

## Task Results

| Task | Result | Summary |
|---|---|---|
| T000 | PASS | Controlled diagnostic specification created |
| T001 | PASS | Current alpha routes and historical ZPK assets audited |
| T002 | PASS | Official Zepp claims and their evidentiary limits recorded |
| T010 | PASS | Immutable deterministic RGBA fixture and manifest generated |
| T011 | PASS | Test-only PNG inspection/comparison harness validated |
| T012 | PASS | Fixture structure, samples, alpha controls, and composites validated |
| T020 | PASS | Browser canvas preserved every alpha byte and composite appearance within G3 tolerance |
| T021 | PASS | Both untouched static-image branches preserved encoded bytes and decoded RGBA exactly |
| T022 | PASS | 480→466 normalization preserved continuous alpha and scaled geometry deterministically |
| T023 | PASS | Switcher ordering passed; exact and normalized frames matched their references byte-for-byte |
| T024 | FAIL | Identical Arial glyph geometry produced color-dependent alpha masks before PNG encoding |
| T025 | FAIL | All digits reproduced color-dependent alpha; tabular, sizing, bounds, and centering were ruled out |
| T026 | MIXED | Icon recolor and weather shapes passed; text-bearing weather output failed color invariance |
| T027 | PASS | Tonal/sharpness alpha preserved; opacity exact; vignette overlay alpha documented |
| T028 | PASS | Pointer pivots/dimensions stable; neutral/opacity/effect alpha contracts measured |
| T029 | PASS | 19 label assets binary, isolated, deterministic, and within coverage/centroid limits |
| T030 | PASS | Eight test-only diagnostic ZPKs built; every archive, embedded manifest, route reference, asset hash, and binary-control copy validated |
| T031 | PASS | All eight outer ZPKs and nested device payloads extracted with package, entry, and write-back hashes recorded |
| T032 | PASS | All 36 source/extracted PNG comparisons were byte-identical; packaging introduced zero encoded-byte changes |
| T033 | PASS | All 36 decoded RGBA images, alpha metrics, bounds, histograms, and three reference composites were identical |
| T034 | PASS | All eight packages referenced only intended assets with correct widget types, bindings, geometry, display level, and preserved base code |
| T040 | PASS | Official Zeus CLI 1.9.3 and ZPM 3.4.2 established in an isolated test environment |
| T041 | PASS | Official P9 built from the byte-identical immutable per-pixel-alpha fixture |
| T042 | PASS | Official P10 built from the opaque fixture derivative with widget alpha 128 |
| T043 | PASS | Official SOMH resources extracted; P9 retained 41 alpha levels and P10 retained fully opaque pixels |
| T050 | MIXED | Four local hash-locked install controls built; authenticated Zepp install QR unavailable |
| T051 | BLOCKED | Private GitHub upload authentication returned HTTP 401; no hosted bytes were created |
| T052 | BLOCKED | No logged-in Zeus account, simulator, Developer Bridge, or programmatic watch capture |
| T053 | BLOCKED | No exact P9/P10 firmware screenshots exist to measure |
| T060–T064 | PASS | Final hypothesis matrix, score, first-divergence map, minimum fix, and evidence manifest completed |

## Verdict Discipline

No production-wide alpha policy is authorized while G8 is blocked. A narrowly
scoped text-only compatibility finalizer may be considered independently
because T024/T025/T029 directly validate that boundary and workaround.
