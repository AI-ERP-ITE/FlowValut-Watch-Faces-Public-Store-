# Moon Runtime Characterization — T023

**Date:** 2026-08-01  
**Scope:** System A evidence and regression characterization only

## Verdict

The editor-side resolution design is correct: official Zepp design documents
require **7, 13, or 30** Moon phase images. Fifteen is not a supported option.
System A already enforces those exact choices, preserves chronological asset
order, defaults new sets to 7, and rejects arbitrary counts/ranges/codes.

The runtime adapter is not proven. Current System A emits:

```js
hmUI.createWidget(hmUI.widget.IMG_LEVEL, {
  image_array: moonImages,
  image_length: 7, // or 13 / 30
  type: hmUI.data_type.MOON
})
```

Public documentation conflicts across generations:

- Zepp v2 describes `MOON` as supporting progress.
- Current v3+ describes `MOON` as usable only with `IMG_CLICK` for navigation.
- Current `IMG_LEVEL` documentation lists `level`, not `type`, as its selector.
- Design documentation still requires 7/13/30 phase pictures but does not show
  the runtime phase-to-index adapter.

Therefore absence from the current widget documentation is not enough to call
the existing binding fake. As learned in T005, working undocumented firmware
behavior must be preserved until watch evidence or an official Maker package
proves otherwise.

## Current behavior matrix

| Surface | Current System A behavior | Evidence verdict |
|---|---|---|
| Chooser | Moon only under Image Switcher | Correct |
| Policy | `LUNAR_CYCLE`, no numeric ranges/codes | Correct |
| Counts | exactly 7, 13, or 30; default 7 | Officially correct |
| Slot order | chronological array order | Structurally correct; exact phase boundary semantics not publicly specified |
| Validation | rejects other counts, ranges, codes, and out-of-sequence slots | Correct |
| FVWF | preserves definition ID, frame count, and ordered asset filenames | Characterized and passing |
| Generator | `IMG_LEVEL + hmUI.data_type.MOON` | Unproven/conflicts with current public v3+ docs |
| Package evidence | no extracted Moon package fixture exists in this repository | Missing |
| Physical watch | no T023 watch result supplied | Missing |

## User decision and T024 disposition

The user explicitly directed that Moon Phases remain as-is with the fixed
**7/13/30** choices. T024 is therefore closed with no runtime correction. The
current adapter remains protected by regression tests and may be revisited only
if a concrete on-watch failure or authoritative package proves it incorrect.

## Evidence that would justify reopening T024

One of the following is required:

1. User confirmation that an existing System A 7/13/30 Moon set changes phases
   correctly on the target watch; or
2. An untouched official Watchface Maker package containing Moon phase images;
   or
3. A generated System A Moon ZPK installed on a watch and observed across a
   known phase/date or compared with the native Moon display.

If future evidence shows a failure, use the Maker/device evidence to implement
only the proven adapter; never replace it solely because current public docs
omit the behavior.

## Official sources

- Design rules (7/13/30): https://docs.zepp.com/docs/designs/customization/watchface/
- Watchface specification (7/13/30): https://docs.zepp.com/docs/watchface/specification/
- Current v3+ `data_type`: https://docs.zepp.com/docs/watchface/api/hmUI/widget/data_type/
- v2 `data_type`: https://docs.zepp.com/docs/v2/watchface/api/hmUI/widget/data_type/
- Current `IMG_LEVEL`: https://docs.zepp.com/docs/watchface/api/hmUI/widget/IMG_LEVEL/
- Current `IMG_CLICK`: https://docs.zepp.com/docs/watchface/api/hmUI/widget/IMG_CLICK/
