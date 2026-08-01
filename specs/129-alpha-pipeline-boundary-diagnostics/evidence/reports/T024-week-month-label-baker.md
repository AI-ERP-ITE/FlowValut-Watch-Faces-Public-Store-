# T024 — Week/Month Label Baker

**Executed**: 2026-07-29  
**Result**: FAIL — color-invariant alpha assumption is false  
**First divergence**: Chrome `fillText()` canvas pixels, before PNG encoding

## Route Under Test

The current `makeLabelCanvas()` behavior was reproduced exactly in installed
Google Chrome:

```text
transparent canvas
→ fillStyle = selected color
→ font size = floor(height × 0.8)
→ decrement font size only while measured width > 95% of canvas width
→ textAlign = center
→ textBaseline = middle
→ one fillText()
→ PNG encode
```

Controls:

- Labels: `WED` and `JUL`.
- Font: Arial bold.
- Element font-size/bitmap heights: 21 and 40.
- Colors: reported orange `#e69a5a`, black `#000000`, and teal `#00a887`.
- Widths: 60 at height 21 and 100 at height 40.

No shadow, stroke, duplicate draw, opacity adjustment, binary-alpha transform,
packaging, or production change was present.

## Existing 80% Logic

The `0.8` factor is not opacity. It deliberately maps the widget's requested
height to a glyph size that leaves vertical room inside its bitmap and matches
the surrounding canvas-text sizing convention.

Actual results:

| Widget height | Initial/actual Arial font size |
|---:|---:|
| 21 | 16 px |
| 40 | 32 px |

Neither label triggered width shrinking in these controls. Removing the 80%
factor would change established sizing, fitting, alignment, and clipping
behavior; T024 does not propose or perform that change.

## Machine-Readable Evidence

- `evidence/tooling/label-baker-diagnostic.mjs`
- `evidence/tooling/analyze-label-alpha.mjs`
- `evidence/flowvault-routes/T024-label-baker/`
- `evidence/flowvault-routes/T024-label-alpha-analysis.json`

## Decisive Finding

Changing only the fill color changed the generated alpha mask.

Orange alpha coverage compared with black:

| Label | Widget height | Orange coverage | Black coverage | Orange increase |
|---|---:|---:|---:|---:|
| WED | 21 | 246.8471 | 225.2196 | 9.6028% |
| JUL | 21 | 150.6863 | 136.1098 | 10.7093% |
| WED | 40 | 916.7216 | 873.4275 | 4.9568% |
| JUL | 40 | 539.9020 | 509.3843 | 5.9911% |

Teal was also above black, but below orange:

| Label | Widget height | Teal increase over black |
|---|---:|---:|
| WED | 21 | 6.0978% |
| JUL | 21 | 6.8745% |
| WED | 40 | 3.1321% |
| JUL | 40 | 3.8239% |

For every label/size group:

- alpha-mask hashes differed across colors;
- total alpha coverage differed across colors;
- alpha centroids differed slightly across colors;
- the number/distribution of intermediate alpha levels differed.

This reproduces the user's observation that the same font and geometry can
behave differently when only the color changes. The effect is proportionally
larger at the original height 21 than at height 40, but increasing the size
does not eliminate it.

## Where the Divergence Begins

T024 captured alpha twice:

1. directly from `context.getImageData()` immediately after `fillText()`;
2. by decoding the subsequently exported PNG.

For all 12 controls, the live-canvas alpha SHA-256 exactly matched the decoded
PNG alpha SHA-256.

Therefore:

- the PNG encoder is not introducing this color dependency;
- the later data-URL/Blob route is not introducing it;
- the difference already exists in Chrome's rasterized canvas pixels;
- the PNG faithfully preserves that difference.

## RGB Quantization Finding

On partial-alpha pixels, exported colored RGB frequently differs slightly from
the requested fill color:

- orange maximum deviation was 6 levels at height 21 and 38 at height 40;
- teal maximum deviation was 6 levels at height 21 and 120 at height 40;
- black remained exact because premultiplication/unpremultiplication rounding
  cannot move zero RGB.

This is compatible with browser premultiplied-canvas quantization. It is not
proof of the watch's compositing equation, but it explains why black is a
special control and why color-dependent edge behavior can survive into the
device asset.

## Verdict

T024 is a diagnostic FAIL because the label baker does not produce a
color-invariant coverage mask:

- there is still only one draw;
- there is still no hidden shadow or duplicate widget;
- `#e69a5a` genuinely bakes more alpha coverage than black for the same glyph;
- the difference is strongest at the reported small size;
- the first divergence is browser text rasterization, not ZPK packaging.

This substantially changes the investigation: the watch may amplify or
miscompose the partial edge pixels, but it is receiving color-dependent label
alpha before packaging. No production fix is authorized yet; later numeric,
packaging, official-tool, and firmware tests remain necessary before selecting
the minimum safe correction.

