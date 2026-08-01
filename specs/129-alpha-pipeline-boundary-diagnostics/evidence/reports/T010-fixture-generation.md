# T010 — Immutable RGBA Fixture Generation

**Executed**: 2026-07-29  
**Result**: PASS  
**Gate G1**: Pending independent validation in T012

## Artifacts

- `evidence/fixture/generate-alpha-fixture.mjs`
- `evidence/fixture/alpha-fixture.png`
- `evidence/fixture/alpha-fixture.manifest.json`

## Fixture Identity

```text
Fixture ID: spec129-rgba-alpha-v1
Dimensions: 480x480
PNG color type: 6 (RGBA)
Bit depth: 8
PNG SHA-256: 943644b2db678f4257c52ced0417a00f62565a50d637bca6565e4db57d4dc01e
Manifest SHA-256: a1591862cb2e9d6754fc0a53fd24cb08f87af1939588570cbac80fb76b867536
Sample points: 73
Distinct alpha values: 161
```

## Included Controls

- Exact alpha grid for white, black, red, green, blue, and orange.
- Required alpha values:
  `0, 32, 64, 96, 128, 160, 192, 224, 255`.
- Straight-RGB partial-alpha row.
- Deliberately premultiplied-RGB control row.
- Opaque antialiased circle.
- Partial-alpha antialiased circle.
- Thin and thick antialiased diagonals.
- White reflection/luminance ramp with alpha `0–160`.
- Fully transparent magenta region retaining nonzero RGB.

## Determinism

The generator was executed twice without changing any input.

| Artifact | First run | Second run | Result |
|---|---|---|---|
| PNG | `943644b2...d4dc01e` | `943644b2...d4dc01e` | PASS |
| Manifest | `a1591862...b867536` | `a1591862...b867536` | PASS |

The generator uses direct integer RGBA writes plus deterministic 8×8 analytic
coverage sampling. It does not depend on:

- Browser canvas.
- Installed fonts.
- GPU rasterization.
- CSS color parsing.
- Platform image interpolation.

## T010 Verdict

PASS:

- Immutable fixture and coordinate manifest were generated.
- Required discrete alpha levels are present.
- Continuous antialias/reflection alpha values are present.
- Straight and premultiplied RGB controls are distinguishable.
- Repeated generation is byte-stable.

G1 remains pending because T012 must validate the generated file independently
using the inspection harness created in T011.

