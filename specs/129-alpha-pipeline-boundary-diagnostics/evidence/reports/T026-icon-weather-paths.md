# T026 — Icon and Weather Paths

**Executed**: 2026-07-29  
**Result**: MIXED / diagnostic FAIL for text-bearing weather output  
**Isolation result**: recoloring and shape rasterization pass; `fillText()` fails

## Routes Under Test

Three non-label controls were reproduced in installed Google Chrome:

1. Deterministic icon bake:

```text
immutable RGBA fixture
→ drawImage() at unchanged 480×480
→ getImageData()
→ neutral or full colorize through RGB replacement
→ putImageData()
→ PNG
```

2. Shape-only weather code 0:

```text
transparent 60×60 canvas
→ eight stroked sun rays
→ filled circular sun disc
→ PNG
```

3. Text-bearing weather code 11:

```text
transparent 60×60 canvas
→ filled cloud path
→ three fillText("*") snowflakes
→ PNG
```

Orange `#e69a5a`, black `#000000`, and teal `#00a887` were used as
color-isolation controls. Neutral icon output was included as the alpha
reference.

No widget-opacity, binary-alpha, photo-edit, ZPK, or production change was
applied.

## Machine-Readable Evidence

- `evidence/tooling/icon-weather-diagnostic.mjs`
- `evidence/tooling/analyze-icon-weather-alpha.mjs`
- `evidence/flowvault-routes/T026-icon-weather/`
- `evidence/flowvault-routes/T026-icon-weather-alpha-analysis.json`

## Deterministic Icon Baker

Neutral, orange-colorized, black-colorized, and teal-colorized icon outputs had
the exact same alpha SHA-256:

```text
332326de61a6e6a28f31a70217d0fa2c718410685bf2ba69d35483b8f67f536a
```

All four outputs also had:

- total coverage: `52,574.74509801917`;
- partial-alpha pixels: `74,234`;
- unique alpha levels: `161`.

Result: PASS. Changing RGB through the deterministic pixel-effects path does
not alter alpha. This is materially different from drawing colored text.

## Shape-Only Weather Sun

Orange, black, and teal generated identical alpha masks:

```text
Alpha SHA-256:
eed88d7cc196c5777f6942c73e7475612e56081a3750ab840a7c1510235eddf1

Coverage:
665.674509803922

Partial-alpha pixels:
188
```

Orange-versus-black and teal-versus-black coverage differences were both
exactly zero.

Result: PASS. Canvas path fills, arcs, and strokes do not reproduce the
color-dependent alpha behavior in this isolated weather primitive.

## Text-Bearing Weather Snow

The cloud-plus-snowflake output failed color invariance:

| Color | Coverage | Partial pixels | Unique alpha levels |
|---|---:|---:|---:|
| Orange | 276.627450980392 | 109 | 80 |
| Black | 272.8509803921567 | 109 | 77 |
| Teal | 275.22745098039206 | 109 | 78 |

Coverage differences:

- orange versus black: `+1.3840780717765844%`;
- teal versus black: `+0.8709774781896495%`.

The total percentage is smaller than pure labels because the color-invariant
cloud shape contributes most of the icon. The alpha hashes still differ,
showing that the `fillText("*")` snowflake pixels reproduce the text behavior
inside the mixed weather renderer.

Result: FAIL for color invariance.

## Live Canvas Versus PNG

For all ten outputs, alpha captured directly from `getImageData()` exactly
matched alpha decoded from the exported PNG.

PNG encoding again preserves rather than creates the divergence.

## Verdict

T026 sharply limits the safe scope of any later fix:

- post-rasterization icon recoloring preserves alpha exactly;
- shape-only canvas fills and strokes preserve color-invariant alpha;
- text embedded inside another generator reproduces color-dependent alpha;
- the shared failure boundary is `fillText()` on a transparent canvas, not
  generic colored pixels, generic canvas drawing, or PNG encoding.

Therefore a blanket binary-alpha or transparency rewrite across every widget
would be unsupported and risky. It would destroy legitimate icon, reflection,
glow, weather-shape, and effects alpha that does not exhibit the source
color-dependency. Any later correction should remain targeted to rasterized text
unless subsequent route or firmware evidence proves a broader boundary.

