# T020 — Browser Canvas Encode/Decode Round-Trip

**Executed**: 2026-07-29  
**Result**: PASS  
**G3 contribution**: PASS for the isolated unchanged-size canvas route

## Route Under Test

The immutable 480×480 fixture was loaded by installed Google Chrome, decoded by
the browser, drawn once to a transparent 480×480 `HTMLCanvasElement` at `(0,0)`
with no scaling or effects, and exported through:

```text
canvas.toBlob(callback, "image/png")
```

No production source or generator behavior was changed.

## Machine-Readable Evidence

- `evidence/flowvault-routes/T020-browser-canvas-roundtrip.png`
- `evidence/flowvault-routes/T020-browser-canvas-inspection.json`
- `evidence/flowvault-routes/T020-browser-canvas-comparison.json`
- `evidence/tooling/browser-canvas-roundtrip.mjs`

## Results

| Measurement | Source | Canvas output | Result |
|---|---:|---:|---|
| Dimensions | 480×480 | 480×480 | PASS |
| PNG format | RGBA, 8-bit | RGBA, 8-bit | PASS |
| Unique alpha values | 161 | 161 | PASS |
| Partial-alpha pixels | 74,234 | 74,234 | PASS |
| Alpha-channel mismatches | — | 0 | PASS |
| Total alpha coverage | 52,574.74509801917 | 52,574.74509801917 | PASS |
| Alpha centroid X | 236.54454945943738 | 236.54454945943738 | PASS |
| Alpha centroid Y | 203.65949236799332 | 203.65949236799332 | PASS |
| Nonzero-alpha bounds | 21,20–421,436 | 21,20–421,436 | PASS |
| Encoded bytes | 8,710 | 13,523 | Changed as expected |
| Raw RGBA mismatched pixels | — | 16,860 | Explained below |

## Encoded and Decoded Identity

```text
Source encoded SHA-256:
943644b2db678f4257c52ced0417a00f62565a50d637bca6565e4db57d4dc01e

Canvas encoded SHA-256:
59e0b820fd30a75edf565ea146e427d330e52a4951812e4d981934f92470b54e
```

The encoded files and decoded raw RGBA are not byte-identical. This is not
alpha loss:

- all 161 alpha levels survive;
- every alpha byte survives exactly;
- coverage, centroid, and bounds survive exactly;
- Chrome clears RGB stored beneath fully transparent pixels, reducing the
  transparent-nonzero-RGB count from 7,984 to zero;
- another 8,876 pixels contain RGB normalization/quantization differences
  associated with browser decode/draw/encode handling.

Hidden RGB is not visible when alpha is zero, so its loss must not be treated as
a compositing failure by itself.

## Composite Equivalence

| Background | Mean absolute channel error | Maximum channel delta | Result |
|---|---:|---:|---|
| Black | 0 | 0 | Exact PASS |
| White | 0 | 0 | Exact PASS |
| 8×8 checker | 0.007877604166666666 | 1 | PASS |

Black and white composites are pixel-identical. The checker control differs by
at most one 8-bit channel level, which is inside G3's explicit tolerance.

## Verdict

The browser canvas round-trip does **not** binary-quantize or remove per-pixel
alpha in this controlled route. It does rewrite non-visible RGB under alpha
zero and performs small RGB normalization around transparency, but preserves
the observable composites within the specified tolerance.

Therefore:

- canvas re-encoding explains an encoded-hash mismatch;
- canvas re-encoding does not explain the watch turning partial alpha into
  fully opaque pixels;
- subsequent route tests must compare alpha and composites, not only PNG bytes
  or raw hidden RGB.

