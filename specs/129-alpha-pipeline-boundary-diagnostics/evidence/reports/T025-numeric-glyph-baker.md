# T025 — Numeric Glyph Baker

**Executed**: 2026-07-29  
**Result**: FAIL — color-invariant alpha assumption is false  
**First divergence**: Chrome `fillText()` pixels in the numeric renderer

## Route Under Test

The separate `generateOptimizedDigitBitmaps()` route was reproduced with its
current production behavior intact:

```text
target bitmap height
→ font size = floor(height × 0.8)
→ scratch-canvas measurement of all digits
→ natural advance width from measureText()
→ optional shared tabular width
→ transparent output canvas
→ centered fillText()
→ PNG encode
```

Controls:

- Digits: all ten (`0`–`9`).
- Heights: 21 and 40.
- Width modes: natural and tabular.
- Font: Arial bold.
- Colors: `#e69a5a`, `#000000`, and `#00a887`.
- Total PNG outputs: 120.

No optical compensation, pair correction, maximum-glyph substitution, shadow,
stroke, opacity adjustment, packaging, or production change was applied.

## Machine-Readable Evidence

- `evidence/tooling/numeric-glyph-diagnostic.mjs`
- `evidence/tooling/analyze-numeric-alpha.mjs`
- `evidence/flowvault-routes/T025-numeric-glyphs/`
- `evidence/flowvault-routes/T025-numeric-alpha-analysis.json`

## Color-Invariance Result

Zero of 40 digit/height/width-mode groups had identical alpha masks across the
three colors.

Orange coverage compared with black:

| Height | Width mode | Minimum | Maximum | Mean |
|---:|---|---:|---:|---:|
| 21 | Natural | +8.5196% | +14.0296% | +10.3973% |
| 21 | Tabular | +8.5196% | +14.0296% | +10.3973% |
| 40 | Natural | +5.0730% | +6.7139% | +5.8220% |
| 40 | Tabular | +5.0730% | +6.7139% | +5.8220% |

Teal coverage compared with black:

| Height | Width mode | Minimum | Maximum | Mean |
|---:|---|---:|---:|---:|
| 21 | Natural | +5.2623% | +8.9132% | +6.4744% |
| 21 | Tabular | +5.2623% | +8.9132% | +6.4744% |
| 40 | Natural | +3.0894% | +4.5104% | +3.6466% |
| 40 | Tabular | +3.0894% | +4.5104% | +3.6466% |

The small-size result matches T024: the proportional color dependency is
strongest near height 21 and remains present at height 40.

## Geometry Isolation

For all 40 color-comparison groups:

- decoded bitmap dimensions were identical across colors;
- scratch-measured visible bounding boxes were identical across colors;
- natural advance widths were therefore unchanged;
- centering inputs were unchanged.

For Arial in this test, every digit's natural and tabular output was also
byte-identical:

```text
2 heights × 3 colors × 10 digits = 60/60 exact matches
```

This proves the observed color dependency is not caused by:

- tabular mode;
- maximum family width;
- per-digit natural width;
- fitting;
- centering;
- measured ink bounds.

The tabular and natural results match here because Arial's tested digit
advances resolve to the same bitmap widths. The tabular logic remains important
for fonts whose digit advances differ and was not changed.

## Live Canvas Versus Encoded PNG

For all 120 outputs, the alpha hash captured directly from
`context.getImageData()` exactly matched the alpha hash decoded from the
exported PNG.

Therefore PNG encoding is again innocent: the color-dependent alpha already
exists in the live browser canvas and is faithfully preserved into the asset.

## Verdict

T025 is a diagnostic FAIL because numeric glyph alpha is not color-invariant.
This changes the scope established by T024:

- the behavior is not unique to `makeLabelCanvas()`;
- two independent text renderers reproduce it;
- size, geometry, centering, and tabular logic are ruled out;
- the common boundary is browser canvas `fillText()` on transparency;
- colored antialiased text assets can reach packaging with materially different
  alpha coverage despite identical font geometry.

No production correction is made here. Later icon/effects/pointer and package
tests remain necessary to distinguish a text-only post-processing candidate
from any broader PNG policy.

