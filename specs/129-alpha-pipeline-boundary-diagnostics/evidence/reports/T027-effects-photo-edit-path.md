# T027 — Effects and Photo-Edit Path

**Executed**: 2026-07-29  
**Result**: PASS against current coded alpha contracts  
**Warning**: vignette intentionally creates alpha outside source artwork

## Route Under Test

The immutable fixture was normalized once to a 128×128 neutral effects
baseline. Each effects class was then tested independently with the current
operation order and formulas:

1. Neutral deterministic color-adjustment bake.
2. Explicit opacity `0.5`.
3. Exposure `25`, brightness `10`, contrast `15`.
4. Highlights `25`, shadows `15`, temperature `20`, tint `-10`.
5. Sharpness `50`.
6. Vignette `50`.

The smaller controlled canvas reduces evidence size while exercising the same
per-pixel, filter-redraw, convolution, and gradient-compositing code paths.

No binary-alpha transformation, packaging, firmware rendering, or production
change was applied.

## Machine-Readable Evidence

- `evidence/tooling/effects-photo-edit-diagnostic.mjs`
- `evidence/tooling/analyze-effects-alpha.mjs`
- `evidence/flowvault-routes/T027-effects-photo-edit/`
- `evidence/flowvault-routes/T027-effects-alpha-analysis.json`

## Baseline

The neutral normalized output contained:

- 190 unique alpha levels;
- 9,156 transparent pixels;
- 6,208 partial-alpha pixels;
- 1,020 opaque pixels;
- total alpha coverage `3,728.007843137334`.

This is the pre-effect alpha reference for T027.

## Alpha-Preserving Effects

Each of these produced the exact same alpha SHA-256 as the neutral baseline:

```text
922a5ebc31c1ea6fe2232e2da86cb03c8c89efd09504e3a4285380146b4ea936
```

| Effect | Alpha mismatches | Maximum alpha delta | Result |
|---|---:|---:|---|
| Exposure/brightness/contrast | 0 | 0 | PASS |
| Highlights/shadows/temperature/tint | 0 | 0 | PASS |
| Sharpness 50 | 0 | 0 | PASS |

These RGB and convolution operations do not silently damage source alpha.

## Explicit Opacity

Expected equation:

```text
output alpha = round(source alpha × 0.5)
```

Results:

- expected-equation mismatches: `0`;
- transparent pixels becoming nonzero: `0`;
- nonzero pixels becoming transparent: `0`;
- opaque output pixels: `0`;
- partial-alpha output pixels: `7,228`;
- resulting coverage: `1,867.580392156906`.

The small difference from exactly half the aggregate baseline coverage is the
sum of required per-pixel integer rounding. The implementation performs the
documented equation exactly.

Result: PASS.

This is direct evidence that some current effects deliberately require
intermediate alpha. Globally deleting partial alpha would delete user-selected
opacity behavior rather than fix an incidental artifact.

## Vignette

The vignette implementation draws a radial translucent black gradient over the
entire canvas using normal source-over compositing.

Measured result:

- alpha mismatches versus baseline: `15,360`;
- formerly transparent pixels becoming nonzero: `9,156`;
- transparent pixels remaining: `0`;
- partial-alpha pixels: `15,364`;
- opaque pixels: `1,020`;
- coverage increased from `3,728.0078` to `7,846.4941`;
- maximum alpha increase/difference: `108`.

Result: PASS against the code's actual generated-overlay behavior, with a
material design warning.

The vignette is not merely changing RGB inside the existing artwork mask. It
creates a partially transparent black overlay across the full rectangular
asset, including pixels that were fully transparent. This may be visually
intentional for rectangular photos, but can create an unwanted dark rectangle
when applied to a cutout icon. That concern is independent of the colored-text
failure and is not changed in this diagnostic task.

## Live Canvas Versus PNG

For all six outputs, alpha captured directly from the live canvas exactly
matched alpha decoded from the exported PNG.

PNG encoding preserves every intended or generated effect-alpha change.

## Verdict

T027 confirms that the effects system has several distinct alpha contracts:

- tonal and sharpness operations preserve alpha;
- explicit opacity intentionally scales alpha;
- vignette intentionally generates new overlay alpha;
- none of these changes originate in PNG encoding.

Therefore a global `0/255` alpha policy would break legitimate functionality.
The current text-rasterization problem must not be “fixed” by rewriting images
or effects indiscriminately.

