# T033 — Decoded RGBA, geometry, and composite preservation

**Result:** PASS  
**Scope:** Decoded-image comparison only; no production implementation.

## Result

All 36/36 independently extracted PNG assets decoded identically to their
pre-package references.

Global maximum deviations:

| Measurement | Maximum deviation |
|---|---:|
| Mismatched RGBA pixels | 0 |
| Mismatched alpha pixels | 0 |
| Any channel delta | 0 |
| Alpha coverage delta | 0 |
| Alpha centroid delta | 0 |
| Bounds differences | 0 |
| Alpha-histogram differences | 0 |
| Composite differences | 0 |

Black, white, and 8-pixel checkerboard composites were identical for every
asset. PNG chunk type/length sequences were also identical.

## Boundary conclusion

The tested FlowVault ZPK packaging boundary preserves:

- dimensions and PNG metadata structure;
- every decoded RGB and alpha channel byte;
- continuous and binary alpha distributions;
- alpha coverage, centroid, and nonzero bounds;
- resulting appearance under three independent background composites.

Combined with T032, local packaging is ruled out as the divergence boundary.
Any remaining difference must occur before the measured source asset exists or
after the unchanged PNG enters Zepp tooling/firmware/runtime decoding and
compositing.

T034 still must verify that runtime code references the intended assets with the
intended widget types and geometry. Therefore this task does not yet claim that
the watch selects or places every resource correctly.

## Evidence

- `evidence/packages/T033-decoded-pixel-comparison.json`
- `evidence/tooling/compare-packaged-decoded-pixels.mjs`
