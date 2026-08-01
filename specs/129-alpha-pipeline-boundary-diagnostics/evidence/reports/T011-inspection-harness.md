# T011 — Test-Only PNG Inspection and Comparison Harness

**Executed**: 2026-07-29  
**Result**: PASS  
**Production source changes**: None

## Artifact

`evidence/tooling/alpha-inspector.mjs`

The utility is contained entirely within Spec 129 evidence. It is not imported
by the application, production generators, preview, exporter, or ZPK builder.

## Supported Operations

### Inspect

```text
node alpha-inspector.mjs inspect \
  --input <png> \
  [--manifest <json>] \
  [--output <json>]
```

Reports:

- Encoded SHA-256 and byte size.
- PNG IHDR fields.
- PNG chunk list.
- Dimensions, color type, bit depth, and interlace.
- Complete alpha histogram.
- Transparent, partial-alpha, and opaque pixel counts.
- Transparent pixels retaining nonzero RGB.
- Total alpha coverage.
- Alpha-weighted centroid.
- Nonzero-alpha bounding box.
- Straight/premultiplied-alpha indicators.
- Manifest sample-coordinate validation.
- Decoded composite hashes over black, white, and checker backgrounds.

### Compare

```text
node alpha-inspector.mjs compare \
  --reference <png> \
  --candidate <png> \
  [--output <json>]
```

Reports:

- Encoded byte equality and hashes.
- Dimension equality.
- Decoded RGBA equality.
- Mismatched pixel and alpha-pixel counts.
- Maximum channel delta.
- Per-channel mean absolute error.
- Composite error over black, white, and checker backgrounds.

## Positive Control

The immutable fixture was compared with itself:

```text
Encoded bytes equal: true
Decoded RGBA equal: true
Mismatched pixels: 0
Black composite error: 0
White composite error: 0
Checker composite error: 0
Manifest sample failures: 0
```

## Negative Control

One fully transparent pixel was deliberately changed to alpha `255` in a
temporary copy outside the specification evidence.

The comparator reported:

```text
Encoded bytes equal: false
Decoded RGBA equal: false
Mismatched pixels: 1
Mismatched alpha pixels: 1
Maximum channel delta: 255
```

## T011 Verdict

PASS:

- The utility distinguishes encoded equality from decoded equality.
- It detects exact pixel and alpha changes.
- It measures composited appearance separately from raw RGBA.
- It validates manifest-declared sample coordinates.
- It does not modify production behavior.

