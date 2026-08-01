# T032 — Pre-package versus extracted encoded bytes

**Result:** PASS  
**Scope:** Encoded-byte comparison only; no production implementation.

## Result

All 36/36 PNG assets were byte-for-byte identical before packaging and after
independent extraction:

| Package | Route | Assets | Exact |
|---|---|---:|---:|
| P2 | Static `IMG` pass-through | 1 | 1 |
| P3 | Normalized static `IMG` | 1 | 1 |
| P4 | Image-switcher `IMG_LEVEL` | 1 | 1 |
| P5 | Week/month labels | 2 | 2 |
| P6 | Numeric `TEXT_IMG` | 10 | 10 |
| P7 | Effects/photo-edit `IMG` | 1 | 1 |
| P8 | Pointer `TIME_POINTER` | 1 | 1 |
| P11 | Binary-alpha labels | 19 | 19 |

For every comparison:

- encoded byte length was unchanged;
- SHA-256 was unchanged;
- the first differing byte was `-1`, meaning no differing byte exists.

## Boundary conclusion

ZPK creation, `device.zip` nesting, archive compression, and extraction did not
rewrite, optimize, flatten, quantize, or otherwise alter any tested PNG. The
packaging boundary is therefore ruled out as the source of the alpha behavior
for these routes.

This does not yet classify decoded PNG metadata, RGBA samples, coverage,
centroids, or composites. T033 performs that independent decoded validation,
even though encoded identity already implies decoded identity for a conforming
PNG decoder.

## Evidence

- `evidence/packages/T032-encoded-byte-comparison.json`
- `evidence/tooling/compare-packaged-encoded-bytes.mjs`
