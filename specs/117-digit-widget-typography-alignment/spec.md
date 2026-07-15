# Spec 117 — Digit Widget Typography, Alignment, and Frame Independence

**Feature branch:** `main`  
**Created:** 2026-07-15  
**Status:** Complete — automated, deployed, and verified on physical watch  
**Domain:** ZEP P system task / shared Studio core  
**Deployment target:** Private Pages only (`origin/main`)

## Problem statement

Digit widgets can look centered in Studio but shift on the watch. Frame resizing has also historically changed glyph size or regenerated assets with different geometry. The failure is most visible with proportional fonts, where pairs such as `11` and `88` have different natural widths.

The system must preserve the selected font, separate font size from frame geometry, expose the native alignment choices where Zepp supports a true bounded widget, and generate identical MAIN/AOD behavior.

## Manual and platform contract

1. `IMG_TIME` consumes one 0–9 image array for each time component. It does not support pair-specific assets or pair-specific offsets.
2. `TEXT_IMG` consumes a 0–9 image array and owns `x`, `y`, `w`, `h`, `h_space`, and `align_h`.
3. `IMG_DATE` supports digit mode and character mode. Character mode requires 12 complete month images or 31 complete day images.
4. Zepp advances bitmap digits by PNG canvas width. Preview-only spacing metadata is not available to the device.
5. MAIN and AOD assets must remain independently scoped but use the same generator and layout rules.

## Goals

1. Make `fontSize` the only authority for glyph scale.
2. Make frame width/height control layout space only; frame resizing must never rescale glyphs.
3. Expose Left, Center, and Right alignment for variable numeric `TEXT_IMG` widgets.
4. Make frame reset obey the widget's configured alignment and preserve its visual anchor.
5. Prevent reset from modifying linked decorative frames or unrelated elements.
6. Preserve natural-width proportional digits for variable numeric/date widgets; use explicit tabular cells for fixed-width two-digit time components.
7. Eliminate preview/export disagreement caused by using one sample pair as a permanent device position where the native widget can align dynamically.
8. Apply the same behavior to MAIN and AOD.
9. Provide automated, repeatable regression evidence without requiring exhaustive manual testing.

## Non-goals

1. Do not implement a custom timer that replaces native `IMG_TIME`.
2. Do not create 24/60/60 complete-value time image families.
3. Do not distort, horizontally scale, or individually enlarge narrow glyphs.
4. Do not restore pair-correction tables that only affect Studio preview.
5. Do not migrate working weekday/month-name text rendering unless required by a failing regression.
6. Do not change Firebase, authentication, public storefront, or backend code.

## Functional requirements

### FR-1 — Canonical alignment

- Store alignment as `LEFT`, `CENTER_H`, or `RIGHT`.
- `TEXT_IMG` must expose all three choices in Property Panel.
- Preview and generated Zepp code must consume the same stored value.
- Existing files without `alignH` retain current widget defaults.
- `IMG_TIME` is always a zero-padded two-digit component and is centered within its stored frame.
- Zepp's native left-origin coordinates are derived from that frame center and the generated two-cell width; no preview-sample offset is persisted.

### FR-2 — Font/frame separation

- Changing `fontSize` must not mutate bounds.
- Changing bounds must not mutate `fontSize`.
- Digit PNG height is derived from `fontSize`, falling back to bounds height only for legacy files where `fontSize` is absent.
- Digit PNG width is derived from the chosen typography strategy, never from frame width.

### FR-3 — Reset frame to content/range

- Replace the misleading reset-to-frame-height behavior with a frame-fit operation.
- Preserve `fontSize`.
- Preserve vertical and horizontal alignment.
- Preserve the alignment anchor:
  - LEFT: preserve left edge.
  - CENTER_H: preserve horizontal center.
  - RIGHT: preserve right edge.
- Update only the selected element. Do not invoke linked decorative-frame resize synchronization.
- Width source:
  - `TEXT_IMG`: widest supported value for the selected data type.
  - `IMG_TIME`: widest required two-digit sample in the generated digit family plus configured spacing.
  - numeric `IMG_DATE`: widest required day sample in the selected mode.
  - `IMG_WEEK` and month-name images: widest complete label in the active format.
- Height source: generated asset height from `fontSize`, not the old frame height.

### FR-4 — Variable numeric ranges

The range policy must be centralized and testable. Minimum required maxima:

| Data type | Fit sample |
|---|---|
| STEP | `99999` |
| CAL | `9999` |
| BATTERY | `100` |
| HEART | `999` |
| SPO2 | `100` |
| STRESS | `100` |
| HUMIDITY | `100` |
| UVI | `99` |

Existing decimal/unit behavior must not regress. Unsupported types use a documented conservative fallback.

### FR-5 — Time typography

- Continue using native `IMG_TIME` and ten digit images.
- Never apply pair-specific preview offsets that cannot be exported.
- For `IMG_TIME` only, measure natural advances for 0–9, choose the widest advance as the common cell width, and center every glyph in that cell without scaling or distortion.
- Keep natural advance widths for `TEXT_IMG` and numeric `IMG_DATE`; the time-only rule must not leak into variable-length values.
- The two-cell hour/minute/second width must be constant for every pair, including `11`, `18`, `31`, `58`, and `88`.
- Time components ignore legacy left/right alignment metadata and use the frame center as their canonical Studio anchor.
- Export converts the canonical center to Zepp's required left origin using `frameCenterX - generatedPairWidth / 2` while retaining native `LEFT` alignment.
- Time preview, generated PNG dimensions, generated start coordinates, and native alignment values must be validated together.

### FR-6 — Day/month character mode boundary

- Existing numeric day digit mode remains supported.
- Complete day/month character mode is a separate optional enhancement, not a prerequisite for fixing time or `TEXT_IMG`.
- If implemented, complete day mode must generate exactly 31 images and set `day_is_character: true`.
- Numeric month character mode must generate exactly 12 images and must not overwrite month-name behavior.

### FR-7 — MAIN/AOD parity

- Both scopes use the same layout/range/reset utilities.
- Asset filenames remain scope-prefixed.
- MAIN settings must not overwrite AOD settings and vice versa.
- FVWF save/reload must retain `alignH`, `fontSize`, bounds, and AOD-specific values.

## Acceptance criteria

1. Font-size edits do not change bounds.
2. Frame edits do not change font size or digit PNG height.
3. `TEXT_IMG` Left/Center/Right preview positions equal generated `align_h` values.
4. Reset preserves the correct left/center/right anchor within ±1 px.
5. Reset does not modify any other element.
6. STEP frame fitting accommodates `99999`; CAL accommodates `9999`; BATTERY accommodates `100`.
7. Proportional-font assets retain natural advances and glyph aspect ratios.
8. No `MIN_INK_FRACTION`, pair correction, or frame-derived digit width is reintroduced.
9. MAIN and AOD automated fixtures produce separate asset names and equivalent geometry rules.
10. TypeScript, automated regression script, private build, ZPK contract inspection, and live private deploy verification pass.

## Exit criteria

- All tasks in `tasks.md` are complete.
- Automated report contains zero failures.
- Private production bundle is deployed to `origin/main`.
- Live root and Studio routes serve the same new hashed JS asset.
- No public remote is touched.

## Final physical-device result

On 2026-07-15, the user loaded an existing FVWF without recreating its time widgets. Studio immediately applied the canonical centered time layout. After generating and installing the ZPK, the hour/minute alignment was reported as perfect on the physical watch. This closes the firmware smoke-test recommendation and confirms that export-time tabular regeneration works for previously saved FVWF projects.
