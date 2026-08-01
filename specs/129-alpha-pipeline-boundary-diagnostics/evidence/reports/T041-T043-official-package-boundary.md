# T041–T043 — Official package construction and measurement

**Result:** PASS  
**Compiler:** Zeus CLI 1.9.3 / ZPM 3.4.2

## P9 — Per-pixel alpha

P9 used the immutable fixture byte-for-byte:

`943644b2db678f4257c52ced0417a00f62565a50d637bca6565e4db57d4dc01e`

The official compiler converted it to Zepp's 8-bit indexed `SOMH` resource
format: a 64-byte header, 256-entry RGBA palette, and 480×480 index plane.

- source alpha values: 161
- compiled alpha values: 41
- alpha coverage delta: -2.443137 pixels out of 230,400
- centroid delta: +0.004749 x, +0.025833 y
- nonzero bounds: unchanged
- alpha mismatches: 11,163 pixels due to palette quantization
- mean absolute alpha error: 0.165395 levels

The compiled format therefore retains continuous per-pixel alpha. It does not
reduce alpha to only 0/255.

The complex fixture forces all color/alpha combinations into one 256-entry
palette, producing nontrivial RGB/composite quantization. That is an official
compiler behavior and is separate from binary-alpha loss.

## P10 — Widget opacity

P10 used an opaque derivative of the same fixture and `IMG alpha: 128`.

- compiled alpha values: one value, 255
- alpha mismatches: 0
- maximum RGB error: 2
- mean composite channel error before widget opacity: 0.055607

This cleanly separates opaque resource storage from runtime widget opacity.

## Boundary conclusion

Official Zepp compilation explicitly preserves multiple alpha levels in its
runtime resource format. This refutes the claim that Zepp's compiler accepts
only binary transparency. Firmware behavior still requires digital screenshot
evidence.

## Evidence

- `evidence/official-zepp/T041-T042-source-manifest.json`
- `evidence/official-zepp/T043-official-extraction-manifest.json`
- `evidence/official-zepp/T043-official-compiled-image-measurements.json`
- `evidence/tooling/extract-official-zepp-packages.mjs`
- `evidence/tooling/measure-official-zepp-compiled-images.mjs`
