# T022 — Static-Image Normalization

**Executed**: 2026-07-29  
**Result**: PASS  
**G3 contribution**: PASS for the 480×480 → 466×466 normalized route

## Route Under Test

The immutable 480×480 fixture was forced through the dimension-changing branch
used by `StudioApp.resizeDataUrl()`:

```text
PNG data URL
→ browser Image decode
→ transparent 466×466 canvas
→ drawImage(image, 0, 0, 466, 466)
→ PNG encode
```

The 466 target was selected because it exercises the real 466/480 migration
ratio involved in the reported watchface history. This test changes only asset
dimensions; it does not apply effects, widget opacity, positioning, packaging,
or firmware rendering.

The test-only browser harness now accepts explicit output dimensions. Its
default 480×480 behavior used by T020 is unchanged.

No production source or generator behavior was changed.

## Machine-Readable Evidence

- `evidence/tooling/browser-canvas-roundtrip.mjs`
- `evidence/flowvault-routes/T022-static-normalized-466.png`
- `evidence/flowvault-routes/T022-static-normalized-466-inspection.json`
- `evidence/flowvault-routes/T022-static-normalized-466-repeat.png`
- `evidence/flowvault-routes/T022-normalization-repeat-comparison.json`

## PNG and Alpha Results

| Measurement | Source | Normalized output | Result |
|---|---:|---:|---|
| Dimensions | 480×480 | 466×466 | PASS |
| PNG format | RGBA, 8-bit | RGBA, 8-bit | PASS |
| Unique alpha levels | 161 | 237 | PASS: interpolation retained continuous alpha |
| Partial-alpha pixels | 74,234 | 75,592 | PASS |
| Opaque pixels | 16,586 | 14,797 | Expected resampling change |
| Transparent nonzero-RGB pixels | 7,984 | 0 | Expected browser canvas normalization |
| Nonzero-alpha bounds | 21,20–421,436 | 21,19–409,424 | PASS: scaled, not clipped |

The increase from 161 to 237 alpha levels is expected interpolation. The output
is not binary alpha and contains extensive intermediate coverage.

## Coverage and Geometry

Scale:

```text
466 / 480 = 0.9708333333333333
```

Ideal area-scaled coverage:

```text
49,552.61001087435 pixels
```

Measured coverage:

```text
49,530.843137239906 pixels
```

Difference:

```text
-21.766873634442163 pixels
-0.04392679543956496%
```

Centroid comparison after pixel-center coordinate transformation:

| Axis | Expected scaled centroid | Measured | Absolute difference |
|---|---:|---:|---:|
| X | 229.63075010020378 | 229.68134634277519 | 0.05059624257140172 px |
| Y | 197.70484050726017 | 197.6413586622996 | 0.0634818449605632 px |

These sub-tenth-pixel differences are normal interpolation effects and provide
no evidence of offset duplication, clipping, or stale geometry.

## Determinism

The normalization was executed twice in independent Chrome processes.

| Measurement | Result |
|---|---|
| Output byte length | 21,296 in both runs |
| Encoded SHA-256 | `7a29ef93…d36892` in both runs |
| Encoded bytes equal | true |
| Decoded RGBA equal | true |
| Mismatched pixels | 0 |
| Composite error on all three backgrounds | 0 |

Full normalized SHA-256:

```text
7a29ef939c93843e99862856967217c7862a78401b3f47ccda1c87bfc6d36892
```

## Verdict

The dimension-changing static-image normalization route behaves as a
deterministic browser resample:

- it preserves and expands continuous partial-alpha levels;
- it does not quantize alpha to `0/255`;
- coverage follows the expected area ratio within 0.044%;
- centroid and bounds follow the requested 466/480 geometry;
- independent executions produce identical encoded bytes.

T022 therefore does not explain the watch turning partial transparency opaque.
It does establish that normalization changes encoded bytes and hidden
transparent RGB, so later packaging comparisons for P3 must use this normalized
PNG—not the original 480×480 fixture—as their pre-package reference.

