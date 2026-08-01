# T028 — Pointer and Hand Bitmap Path

**Executed**: 2026-07-29  
**Result**: PASS against current coded contracts  
**Warnings**: zero-effect padding and tint-generated alpha documented

## Route Under Test

The immutable fixture was normalized into a 22×140 hour-hand source and passed
through source-equivalent pointer geometry/effect stages:

```text
22×140 raster hand
→ full-source geometry preparation
→ effect padding
→ pivot translation
→ optional deterministic alpha/RGB adjustment
→ trail
→ shadowed base
→ glow
→ tint overlay
→ PNG
```

Controls:

- neutral raster pointer;
- pointer opacity 50%;
- shadow 50%;
- glow 50%;
- trail 50%;
- orange tint.

Every effect output was compared with a separately captured prepared reference
having the same dimensions, padding, and pivot.

No cropping, source-pivot mode, length scaling, width scaling, packaging,
firmware rendering, or production change was applied.

## Machine-Readable Evidence

- `evidence/tooling/pointer-hand-diagnostic.mjs`
- `evidence/tooling/analyze-pointer-alpha.mjs`
- `evidence/flowvault-routes/T028-pointer-hand/`
- `evidence/flowvault-routes/T028-pointer-alpha-analysis.json`

## Geometry and Pivot

All six effect comparisons preserved output dimensions and pivot coordinates
between the prepared and effected stages.

| Case | Padding | Output size | Pivot |
|---|---:|---:|---:|
| Neutral | 12 | 46×164 | (23,130) |
| Opacity 50 | 12 | 46×164 | (23,130) |
| Shadow 50 | 18 | 58×176 | (29,136) |
| Glow 50 | 22 | 66×184 | (33,140) |
| Trail 50 | 12 | 46×164 | (23,130) |
| Tint | 12 | 46×164 | (23,130) |

Effect compositing did not change the computed pivot or canvas dimensions.

## Neutral Pass-Through

Prepared and effected neutral raster pointers were byte-identical:

```text
SHA-256:
507eb1853c8fe880465616cb63e15f8bb0a2290210db99818698b9d65924e746
```

Alpha mismatches: `0`.

This confirms the early return in `applyPointerEffectsForZPK()` preserves a
raster data URL when no pointer or hand visual effects are active.

## Explicit Opacity

For every pixel:

```text
effected alpha = round(prepared alpha × 0.5)
```

Expected-equation mismatches: `0`.

The operation introduced no alpha outside the prepared artwork and did not
erase any nonzero source pixel completely. Pivot and dimensions remained
unchanged.

Result: PASS.

## Alpha-Generating Visual Effects

| Effect | Alpha mismatches | Transparent→nonzero | Coverage before | Coverage after |
|---|---:|---:|---:|---:|
| Shadow 50 | 6,243 | 5,161 | 657.3176 | 953.4118 |
| Glow 50 | 8,176 | 7,091 | 657.3176 | 856.3725 |
| Trail 50 | 1,308 | 357 | 657.3176 | 697.7451 |

These are intentional effect masks. Their partial alpha is required to
represent blur, glow falloff, and trail strength.

## Tint Behavior

Orange tint changed alpha on 1,070 existing artwork pixels:

- transparent pixels becoming nonzero: `0`;
- coverage increased from `657.3176` to `723.6980`;
- maximum alpha increase/difference: `22`.

This happens because the current tint stage:

1. draws the adjusted base into a tint canvas;
2. applies a 35% `source-in` color fill;
3. draws that partially transparent tinted copy over the already-drawn base.

It is therefore not a pure RGB recolor. Source-over compositing increases alpha
on partial edges. This may be intentional visual strengthening or an
implementation side effect; T028 records it as a concern and does not change
it.

## Zero-Effect Padding Concern

`pointerEffectPaddingFromIntensity(0, 0, 0)` currently returns 12 rather than
zero because:

```text
glowPad = ceil(glow × 20 + 12)
```

At zero glow this is still 12. Consequently, a default 22×140 hour-hand source
is geometry-prepared as 46×164 with its pivot translated from `(11,118)` to
`(23,130)` before the neutral effects early return.

The translated pivot remains internally consistent, so this test does not show
an alignment failure. However, the function comment describes intensity-based
safe margins, and the unconditional 12-pixel margin deserves separate design
review before anyone removes or changes it. It may protect historical pointer
assets or may be accidental; T028 provides no authorization to alter it.

## Live Canvas Versus PNG

For all 12 prepared/effected outputs, live canvas alpha exactly matched decoded
PNG alpha.

## Verdict

The pointer route has multiple legitimate alpha contracts:

- neutral raster pointers pass through unchanged after geometry preparation;
- opacity explicitly scales alpha;
- shadow, glow, and trail intentionally generate alpha;
- tint currently increases existing partial alpha;
- dimensions and pivots remain stable through effect application.

A global binary-alpha rewrite would break pointer opacity and visual effects.
The text-specific finding from T024–T026 must remain isolated from pointer and
hand processing.

