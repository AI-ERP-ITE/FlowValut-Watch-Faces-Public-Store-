# T002 — Official Zepp Documentation Claims and Evidentiary Limits

**Executed**: 2026-07-29  
**Result**: PASS  
**Sources**: Official Zepp documentation only

## Executive Finding

Official Zepp documentation establishes that:

1. `IMG` accepts and recommends PNG images using RGB or RGBA color schemes.
2. Zepp exposes widget-level opacity mechanisms with a `0–255` range.
3. Some drawing widgets expose a direct `alpha` property.

The documentation does **not** explicitly establish:

1. The required compositing equation for intermediate per-pixel PNG alpha.
2. Whether PNG RGB is interpreted as straight or premultiplied alpha.
3. Whether `IMG`, `IMG_WEEK`, `IMG_DATE`, `IMG_LEVEL`, `TEXT_IMG`,
   `TIME_POINTER`, and other image-backed widgets share one decoder/compositor.
4. Whether every supported firmware/device profile implements these behaviors
   identically.
5. Whether 32-bit RGBA recommendation means all 256 alpha values are rendered
   correctly, rather than merely that the file format is accepted.

Therefore, the docs prevent us from labeling partial alpha unsupported without a
test, but they do not prove correct per-pixel compositing on the target watch.

## Claim Matrix

| Claim | Official evidence | Strength | What it proves | What it does not prove |
|---|---|---|---|---|
| PNG RGB/RGBA resources are supported/recommended for `IMG` | Zepp v1, v2, and v3 `IMG` pages | Strong | RGBA PNG is an intended input format | Correct rendering of every intermediate alpha level |
| Widget opacity exists | v3+ `widget.setAlpha(val)` | Strong | A widget can be assigned opacity `0–255` from API level 2.1 | Per-pixel PNG alpha uses the same path |
| Watchface `IMG` may receive `alpha` | Watchface `createWidget` example uses `alpha: 100` | Moderate | Zepp's own watchface example expects an `IMG` opacity parameter | Formal range/semantics for that particular watchface API page |
| Primitive alpha exists | v1 `CIRCLE` documents `alpha` `0–255` | Strong but route-specific | Primitive drawing supports alpha | Image-resource decoder behavior |
| Image fonts use uploaded PNG arrays | `TEXT_IMG` documents `font_array` | Strong | Numeric text images are image resources | Their per-pixel alpha compositor is identical to `IMG` |

## Source Details

### 1. `IMG` resource format

The current v3 `IMG` page recommends 24-bit or 32-bit PNG images with RGB or
RGBA color schemes:

- [Zepp OS v3 `IMG`](https://docs.zepp.com/docs/reference/device-app-api/hmUI/widget/IMG/)

The same recommendation is present in:

- [Zepp OS v2 `IMG`](https://docs.zepp.com/docs/v2/reference/device-app-api/hmUI/widget/IMG/)
- [Zepp OS v1 watchface `IMG`](https://docs.zepp.com/docs/1.0/watchface/api/hmUI/widget/IMG/)

The pages list image source, position, size boundary, offset, angle, and rotation
center. They do not document:

- an alpha-channel formula;
- gamma-correct versus gamma-incorrect compositing;
- straight versus premultiplied RGB;
- quantization behavior;
- per-device compatibility limits.

### 2. Widget-level opacity

The v3+ general widget method states that `widget.setAlpha(val)` sets widget
opacity, with values `0–255`, default `255` opaque and `0` fully transparent.
It is available from API level 2.1:

- [Zepp OS `widget.setAlpha`](https://docs.zepp.com/docs/reference/device-app-api/newAPI/ui/setAlpha/)

The documentation specifically says this method is for widgets that do not
support an `alpha` property. This distinguishes widget-level opacity from the
PNG's embedded per-pixel alpha channel.

### 3. Watchface `IMG` alpha example

The v3+ watchface `createWidget` page contains an `IMG` example with
`alpha: 100`:

- [Zepp watchface `hmUI.createWidget`](https://docs.zepp.com/docs/watchface/api/hmUI/createWidget/)

This is meaningful evidence that the watchface API expects image-widget opacity
to exist. However, the example appears under display-level documentation rather
than a formal `IMG.alpha` property definition, so T041/T042 must confirm actual
compiler and device behavior.

### 4. Primitive transparency

The v1 `CIRCLE` page explicitly defines an `alpha` property in the `0–255`
range:

- [Zepp OS v1 `CIRCLE`](https://docs.zepp.com/docs/1.0/reference/device-app-api/hmUI/widget/CIRCLE/)

This proves that Zepp APIs contain genuine transparency concepts. It does not
establish that RGBA PNG resources are decoded or composited through the same
implementation.

### 5. Image-backed text

`TEXT_IMG` is documented as displaying text from an image font array:

- [Zepp OS v2 `TEXT_IMG`](https://docs.zepp.com/docs/v2/reference/device-app-api/hmUI/widget/TEXT_IMG/)

The page documents array ordering and text/data binding, but says nothing about
alpha-channel semantics. Week/month/numeric tests must remain separated by
widget route.

## Required Interpretation

The following statements are valid:

```text
RGBA PNG is an officially intended IMG resource format.
Widget opacity is an officially intended Zepp capability.
Primitive drawing alpha is an officially intended Zepp capability.
```

The following statements are not yet valid:

```text
Every per-pixel PNG alpha value must render correctly on this firmware.
Widget opacity and embedded PNG alpha use the same compositor.
All image-backed watchface widgets share identical alpha behavior.
FlowVault is necessarily at fault because RGBA is documented.
Zepp is necessarily at fault because a binary-alpha workaround succeeds.
```

## Test Consequences

The fixture/package matrix must test these independently:

1. Untouched RGBA PNG through ordinary `IMG`.
2. Opaque PNG plus widget `alpha`.
3. Opaque PNG plus `widget.setAlpha()` where supported by target API level.
4. RGBA PNG through `IMG_WEEK`/`IMG_DATE`.
5. RGBA PNG through `TEXT_IMG`.
6. RGBA PNG through `IMG_LEVEL`.
7. RGBA PNG through pointer widgets.

The official-package test must record:

- Target Zepp OS version/API level.
- Target device model and firmware.
- Whether Watchface Maker rewrites the PNG.
- Whether the generated code uses `alpha` property or `setAlpha()`.
- Whether the extracted compiled resource retains intermediate alpha.

## T002 Verdict

PASS:

- Official claims were separated by mechanism and API surface.
- Version differences were recorded.
- No unsupported compositing guarantee was inferred from RGBA acceptance.
- The decisive official-vs-FlowVault matrix remains required.

