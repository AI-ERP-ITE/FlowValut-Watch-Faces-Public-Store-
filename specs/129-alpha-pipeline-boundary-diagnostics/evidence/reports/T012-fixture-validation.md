# T012 — Independent Fixture Integrity and Composite Validation

**Executed**: 2026-07-29  
**Result**: PASS  
**Gate G1**: PASS

## Machine-Readable Evidence

`evidence/source-analysis/alpha-fixture-inspection.json`

## Integrity Results

| Measurement | Expected | Actual | Result |
|---|---:|---:|---|
| Width | 480 | 480 | PASS |
| Height | 480 | 480 | PASS |
| PNG color type | 6 / RGBA | 6 / RGBA | PASS |
| Bit depth | 8 | 8 | PASS |
| Interlace | 0 / none | 0 / none | PASS |
| Manifest hash match | true | true | PASS |
| Coordinate samples | 73 | 73 passed | PASS |
| Required alpha levels | 9 | all present | PASS |
| Partial-alpha pixels | greater than 0 | 74,234 | PASS |
| Transparent nonzero-RGB pixels | greater than 0 | 7,984 | PASS |
| Straight-RGB indicator pixels | greater than 0 | 61,282 | PASS |
| Premultiplied-RGB indicator pixels | greater than 0 | 12,952 | PASS |

## Fixture Identity

```text
Encoded PNG SHA-256:
943644b2db678f4257c52ced0417a00f62565a50d637bca6565e4db57d4dc01e

Unique alpha values:
161

Total alpha coverage:
52574.74509801917 pixels

Alpha centroid:
x = 236.54454945943738
y = 203.65949236799332
```

## Reference Composite Hashes

These hashes represent decoded RGBA composited with the test harness's explicit
integer straight-alpha equation.

```text
Black:
58066cff806a5bce05fb24054af09cde641ba898848e4e3e3351d17389eedd7d

White:
c90f9a5378400a0771065c4fc47512c5c992bbcef317a9965331b3f704d8cf5a

8x8 checker:
a83075e2644bbb1d34f5941202545c6618c4ff7174c42d6513bf25f39a4be789
```

Later route tests must compare both raw RGBA and these composited appearances.
An encoded-file hash mismatch alone is not a failure when decoded pixels remain
equivalent.

## G1 Verdict

PASS:

- Fixture dimensions and PNG structure match the manifest.
- Every required discrete alpha level is present.
- Continuous partial-alpha coverage is substantial.
- All exact sample coordinates match.
- Straight and intentionally premultiplied RGB controls are independently
  observable.
- Reference composite hashes are fixed for subsequent tests.

