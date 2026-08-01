# T060–T063 — Hypothesis verdict, first divergence, and fix proposal

## Hypothesis matrix

| Hypothesis | Verdict | Evidence |
|---|---|---|
| H1 FlowVault pass-through damages source | REFUTED | T021 and T032–T033 preserve bytes and decoded RGBA |
| H2 Canvas round-trip destroys alpha | REFUTED for generic images | T020 preserves alpha/composites; hidden RGB normalization is visually irrelevant |
| H3 A generator damages alpha | CONFIRMED for browser `fillText()` masks | T024/T025 and text-bearing T026 show color-dependent alpha before PNG encoding |
| H4 ZPK packaging damages PNG | REFUTED | T030–T034 preserve bytes, pixels, references, geometry, and composites |
| H5 Per-pixel alpha fails while widget opacity works | INCONCLUSIVE at firmware | P9/P10 compile correctly; exact watch screenshots unavailable |
| H6 Firmware provides no usable translucency | INCONCLUSIVE and not supported by compiler evidence | Official P9 retains 41 alpha levels; G7 blocked |

## First measured divergence

For labels and numeric glyphs:

```text
same font + same geometry + different RGB color
  -> browser fillText() creates different alpha masks
  -> PNG encoder preserves those masks
  -> FlowVault ZPK preserves the PNG exactly
  -> watch artifact appears on raw-PNG runtime route
```

The first measured divergence is browser text rasterization, not sizing,
centering, tabular layout, maximum-glyph logic, arrays, coordinates, or ZPK
packaging.

A second architectural difference is now proven:

```text
FlowVault ZPK: raw PNG reaches device package
Official Zeus: PNG -> 8-bit indexed SOMH RGBA resource
```

Official compilation retains 41 alpha levels in P9. Therefore “Zepp supports
only binary alpha” is false at the compiler/resource level. Firmware behavior
between raw PNG and SOMH remains the missing decisive comparison.

## Minimum safe production proposal

Do **not** apply binary alpha globally.

If a production compatibility fix is chosen before G7 is resolved, apply the
already watch-proven coverage-and-centroid-preserving binary-alpha finalizer only
to transparent-canvas text created with `fillText()`:

1. week/month label assets;
2. numeric `TEXT_IMG` glyph assets;
3. any icon/weather generator branch that actually uses `fillText()`.

Run it after final text rasterization and fitting, but before PNG encoding.
Preserve:

- canvas width and height;
- widget coordinates;
- array order and asset naming;
- tabular/natural width selection;
- maximum-glyph sizing;
- centering/alignment inputs;
- digit spacing and optical compensation.

Do not apply it to static images, image switchers, photographs, effects,
vignettes, opacity layers, glows, shadows, trails, icons drawn as shapes, or
pointers/hands.

## Risks

- harder/jagged small-text edges;
- up to 2-pixel nonzero-bound change observed in T029;
- visual weight can vary by glyph and color;
- text-bearing weather/icon routes must be classified correctly;
- accidental application before layout measurement could change alignment;
- a future official SOMH compiler path could make the compatibility finalizer
  unnecessary or undesirable.

## Required regression gates

- coverage error below 0.5 pixel per glyph;
- centroid shift below 0.01 pixel;
- dimensions and encoded asset names unchanged;
- array order unchanged;
- numeric tabular/natural widths and maximum-glyph metrics unchanged;
- widget coordinates and pointer geometry unchanged;
- non-text alpha histograms byte-identical;
- representative watch installation for orange, black, teal, and white text at
  21 and 40 pixels.

## Longer-term alternative

Investigate packaging through Zepp's device-specific SOMH conversion instead of
shipping raw PNGs. This is not the minimum fix: it affects every image, performs
palette quantization, depends on device profiles, and carries licensing,
toolchain, output-size, color-fidelity, and regression risks.
