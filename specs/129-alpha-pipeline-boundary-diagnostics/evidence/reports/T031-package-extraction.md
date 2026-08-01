# T031 — Outer and nested package extraction

**Result:** PASS  
**Scope:** Extraction-only testing; no production implementation.

## Result

All 8/8 diagnostic packages were independently opened and extracted:

| Package | Outer files | Nested device files | Result |
|---|---:|---:|---|
| P2 | 6 | 159 | PASS |
| P3 | 6 | 159 | PASS |
| P4 | 6 | 159 | PASS |
| P5 | 6 | 160 | PASS |
| P6 | 6 | 168 | PASS |
| P7 | 6 | 159 | PASS |
| P8 | 6 | 159 | PASS |
| P11 | 6 | 157 | PASS |

For every package:

- the ZPK SHA-256 matched the immutable T030 matrix;
- the outer archive and nested `device.zip` were readable;
- extracted `device.zip` bytes matched the nested archive bytes;
- every outer and device entry matched after writing and rereading;
- unsafe absolute or parent-traversal ZIP paths were rejected by the extractor.

This task establishes reliable extraction only. Source-to-packaged encoded-byte
comparison is T032, and decoded RGBA/composite comparison is T033.

## Isolation

The extractor wrote only beneath
`specs/129-alpha-pipeline-boundary-diagnostics/evidence/packages/extracted`.
It did not modify application code, exporter behavior, existing source ZPKs, or
deployment files.

## Evidence

- `evidence/packages/T031-extraction-validation.json`
- `evidence/packages/extracted/<package>/extraction-manifest.json`
- `evidence/tooling/extract-diagnostic-package-matrix.mjs`
