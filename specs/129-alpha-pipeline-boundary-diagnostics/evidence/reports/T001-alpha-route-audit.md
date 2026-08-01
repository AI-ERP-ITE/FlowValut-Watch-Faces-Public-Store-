# T001 — Current Alpha Route and Historical ZPK Audit

**Executed**: 2026-07-29  
**Result**: PASS  
**Scope**: Read-only source and historical artifact audit

## Executive Finding

There is no current global alpha-binarization step in FlowVault or in
`zpkBuilder.ts`.

Element files reaching `buildZPK()` are filename-normalized and then inserted
into `device.zip` as the supplied `File` objects. Backgrounds are also inserted
directly when their dimensions already match the project resolution. Therefore,
packaging itself is presently a pass-through candidate, not the leading source
of alpha loss.

Several earlier stages intentionally re-render or modify alpha:

- Canvas text and shape generation.
- Canvas resizing for inline `IMG`, `IMG_LEVEL`, gauge pointers, and icons.
- Effects baking, including explicit alpha multiplication by opacity.
- Shadows, glows, trails, vignette, and antialiased canvas drawing.
- Background normalization when source dimensions differ.

These routes require separate tests.

## Current Route Map

| Route | Source | Operations before package | Expected alpha behavior | Audit risk |
|---|---|---|---|---|
| Background, matching dimensions | Uploaded `File` | No raster conversion | Encoded bytes should be preserved | Low |
| Background, mismatched dimensions | Uploaded `File` | Canvas resize + PNG encode | Partial alpha may be resampled/re-encoded | High |
| Add Image data URL, final fallback | Data URL | `fetch(dataUrl)` to `Blob` | Encoded bytes should be preserved | Low |
| Inline `IMG` export | Data URL | `resizeDataUrl()` unless dimensions already match | Matching size returns original; changed size uses canvas interpolation | High |
| Custom image switcher slot | Slot data URL | Always passed to `resizeDataUrl()`; matching size returns original | Conditional pass-through or canvas resize | High |
| Week/month label | Browser text canvas | `fillText()` + PNG encode | Browser antialiasing creates partial alpha | Confirmed |
| Numeric glyph | Browser text canvas | measured canvas + `fillText()` + PNG encode | Browser antialiasing creates partial alpha | Confirmed |
| Icon without effects | Icon data URL | `applyIconEffectsForZPK()` still rasterizes to requested bounds | Canvas decode/draw/encode | High |
| Icon with color/photo effects | Icon data URL or file | Canvas scale, pixel edits, optional filters/vignette | RGB changes; alpha generally retained except compositing side effects | High |
| Pointer without effects, raster PNG | Data URL | Early return from `applyPointerEffectsForZPK()` | Original data URL preserved at this stage | Low |
| Pointer with opacity/effects | Data URL | Explicit alpha multiplication; shadows/trails/glow/tint canvas compositing | Partial alpha intentionally generated/modified | Critical |
| Pointer SVG | SVG data URL | Always rasterized to PNG | Browser-generated antialias alpha | High |
| Shadow-baked shapes/images | Canvas | shadow RGBA + draw + PNG encode | Continuous partial alpha is intentional | Critical |
| Weather/status/generated icons | Canvas | Canvas drawing + PNG encode | Antialiasing and explicit `globalAlpha` may create partial alpha | High |
| `device.zip` insertion | `File`/`Blob` | JSZip `STORE` | No decoded-pixel transformation expected | Low |

## Source Observations

### `StudioApp.tsx`

1. `makeLabelCanvas()` uses a transparent canvas and one `fillText()` call.
   It performs font fitting but no alpha post-processing.
2. `resizeDataUrl()` returns the original data URL when dimensions already
   match. Otherwise it uses `drawImage()` and `toDataURL('image/png')`.
3. Image-switcher inline frames flow through `resizeDataUrl()`.
4. Inline static images also flow through `resizeDataUrl()`.
5. `applyIconEffectsForZPK()` always calls the deterministic effects baker and
   re-encodes the result.
6. Pointer effects can generate or modify partial alpha through:
   - explicit opacity multiplication;
   - trail `globalAlpha`;
   - shadow RGBA;
   - glow `globalAlpha`;
   - tint compositing.
7. Remaining Add Image data URLs are converted with `fetch(dataUrl)` to a Blob
   before `buildZPK()`, without a pixel transformation in that fallback.

### `effectsBakeEngine.ts`

`bakeDeterministicColorAdjustments()` draws the source into a requested-size
canvas, then explicitly executes:

```text
resultAlpha = round(sourceAlpha * opacity)
```

This proves that an opacity value below 1 is represented as per-pixel PNG alpha
in the current effects route. If firmware later displays it as opaque, the
test must determine whether the generated alpha survives packaging and official
compilation.

Photo-edit RGB operations generally retain existing alpha. Vignette and other
canvas compositing operations can nevertheless alter the final composite alpha
or RGB values through browser premultiplication behavior.

### `digitBitmapGeometry.ts`

Numeric glyphs use a clear canvas followed by one centered `fillText()` call.
No alpha quantization or post-processing exists. Their partial alpha is normal
browser text antialiasing.

### `zpkBuilder.ts`

1. Backgrounds are canvas-normalized only when their natural dimensions differ
   from the configured canvas.
2. `normalizeElementFiles()` changes filenames only.
3. Element `File` objects are placed directly into `assets/`.
4. JSZip uses `STORE` for `device.zip` and the outer ZPK.
5. Thumbnail generation is a separate canvas-resize path and does not establish
   behavior for device widget assets.

The source audit therefore predicts byte preservation for unchanged element
files inside `device.zip`. T032 must confirm this empirically.

## Historical Spec 032 Measurements

All historical PNGs were decoded with `pngjs`; no file was inferred from its
extension alone.

| Package | PNG count | Files containing partial alpha | Binary-alpha files | Fully opaque/transparent-only files |
|---|---:|---:|---:|---:|
| zpk52 | 57 | 56 | 0 | 1 |
| zpk53-remote | 56 | 55 | 0 | 1 |
| zpk62 | 69 | 68 | 0 | 1 |

Examples with partial alpha include:

- `background.png`
- Numeric glyph families
- Weekday images
- Pointer assets

This demonstrates that the historical packaged resources retained intermediate
alpha values. It refutes the narrow hypothesis that the existing package builder
universally converts PNG alpha to `0/255`.

It does **not** prove that every source asset was preserved exactly, because the
historical pre-package source bytes are not available for every asset.

## Historical `trasparente.png`

The file is identical in zpk52, zpk53-remote, and zpk62:

```text
SHA-256: 8059d98804c941bff5bf2cb8ea82b60a20e8f7c6354210ded6046837cd437cd1
Dimensions: 1x1
PNG color type: 6 (RGBA)
Unique alpha values: [0]
Pixel RGBA: transparent black
```

It is the generated transparent button/background helper. It contains no 25%,
40%, 50%, 75%, or 100% comparison bands and therefore cannot answer the current
translucency question.

## Confirmed Binary-Label Control

The diagnostic transformed 19 main-view week/month assets:

- Source partial-alpha pixels per asset: 123–233.
- Result partial-alpha pixels: 0.
- Maximum absolute coverage error: 0.4863 pixel.
- Maximum centroid shift: 0.00877 pixel.
- The watch result was reported visually correct.

This confirms the workaround and establishes a useful control, but does not
identify whether the original failure began in browser rasterization, Zepp
compilation, or firmware compositing.

## First-Divergence Candidates

Ordered by current evidence:

1. Zepp compilation/resource decoding or firmware compositing of intermediate
   alpha.
2. Canvas resize/re-encode routes, especially source RGB beneath partial alpha.
3. Effects routes that intentionally multiply or composite alpha.
4. Browser text rasterization characteristics for colored small glyphs.
5. ZPK insertion itself — currently lower probability because it does not decode
   element PNGs and historical packages retain intermediate alpha.

## T001 Verdict

PASS:

- Current routes were individually located and classified.
- Historical evidence was decoded and measured.
- The historical transparent helper was correctly limited as evidence.
- No production behavior was changed.

The next task, T002, must record the exact Zepp documentation claims and separate
“RGBA accepted,” “per-pixel alpha rendered,” and “widget opacity supported”
instead of treating them as equivalent.

