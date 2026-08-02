# Spec 132 — Layered PNG Gauge Sets and PNG Arcs

**Status:** Approved for implementation  
**Created:** 2026-08-02  
**Domain:** Zepp watchface widgets, canvas preview, assets, ZPK generation  
**Predecessors:** Specs 038, 089, 091, 092, 093

## Problem

FlowVault can decompose authored SVG/HTML gauges into a static background, an
`IMG_LEVEL` value layer, and an `IMG_POINTER` needle. High-end pixel artwork is
often supplied as PNG, but the Gauge Pointer creator has no equivalent direct
PNG composition workflow. Native `ARC_PROGRESS` also cannot reproduce textured,
metallic, illuminated, or otherwise raster-authored arc artwork.

A single flattened PNG cannot be separated losslessly: pixels hidden beneath a
needle or foreground do not exist in the source. Automatic segmentation is not
an acceptable production dependency.

## Goals

1. Add a direct, deterministic layered-PNG workflow to Gauge Pointer Sets.
2. Add a distinct PNG Arc render mode without changing native Arc behavior.
3. Preserve existing HTML/SVG gauge parsing and all saved FVWF files.
4. Keep canvas, FVWF round-trip, generated assets, and watch runtime aligned.
5. Prevent excessive ZPK growth through frame-count and size reporting.

## Non-Goals

- Automatic semantic splitting of one flattened PNG.
- AI inpainting of hidden gauge pixels.
- Production dependency on undocumented `IMG_ARC_PROGRESS`.
- Changing data-type eligibility, range semantics, or existing native Arc output.
- Replacing the existing HTML/SVG gauge creator.

## Feature A — Layered PNG Gauge Pointer Set

The Gauge Pointer property panel gains a separate **Layered PNG Gauge Set**
section. It accepts:

| Slot | Required | Runtime representation |
|---|---:|---|
| Background PNG | No | Static `IMG`, below other gauge layers |
| Needle PNG | Yes | Existing `GAUGE_POINTER` → Zepp `IMG_POINTER` |
| Switcher PNGs | No | Existing `IMG_LEVEL`, preserving user order/ranges |
| Foreground/glass PNG | No | Static `IMG`, above the needle |

Requirements:

1. Each PNG remains a separate source asset; no destructive compositing.
2. The user sets the needle pivot using the existing normalized pivot controls.
3. All created layers share one `gaugePairId` and the selected data type.
4. Layer order is background → switcher → needle → foreground.
5. Rebuilding replaces only siblings created for that gauge; it never deletes
   unrelated elements.
6. Existing hue/saturation/highlight/effect baking continues through the normal
   asset pipeline for the needle and any layer type that already supports it.
7. Existing HTML/SVG creation remains unchanged and available beside PNG mode.

## Feature B — PNG Arc Mode

`ARC_PROGRESS` gains an optional authoring mode:

- `native` (default and legacy behavior);
- `png-frames` (new).

PNG Arc inputs:

| Input | Required | Purpose |
|---|---:|---|
| Track/background PNG | No | Empty/static arc artwork |
| Active arc PNG | Yes | Fully filled 100% arc artwork |
| Reveal direction | Yes | Clockwise or counter-clockwise |
| Start/end angles | Yes | Reuse existing Arc geometry |
| Frame count | Yes | 11 or 21 in v1; default 11 |

FlowVault uses an export-time angular reveal mask to generate ordinary RGBA PNG
frames. Zepp never receives or evaluates the mask. The ZPK uses the established
image-progress/`IMG_LEVEL` route to display finished frames according to the
selected data type.

Requirements:

1. Native Arc remains the default for old and new elements.
2. Old FVWF files with no PNG Arc fields export byte-equivalent widget logic.
3. Frame 0 contains no active-arc pixels; the final frame contains the complete
   active-arc artwork.
4. Frame order is monotonic and deterministic.
5. Track artwork is static and must not be duplicated into every frame when a
   separate static layer can be emitted.
6. Canvas preview uses the same generated frame source as ZPK export.
7. Generated frames preserve source dimensions and RGBA pixels outside the
   reveal operation.
8. Unsupported/unbounded data types remain excluded by existing authority rules.

## Runtime Support Boundary

Zepp officially supports native `ARC_PROGRESS`, picture progress, and image
arrays selected by level. The PNG reveal mask is strictly a FlowVault authoring
operation. `IMG_ARC_PROGRESS` exists in some firmware but is undocumented and is
not used by this production feature.

## Data Model

New optional `WatchFaceElement` fields:

```ts
gaugePngBackgroundSrc?: string;
gaugePngForegroundSrc?: string;
gaugePngSwitcherFrames?: string[];

arcRenderMode?: 'native' | 'png-frames';
arcPngTrackSrc?: string;
arcPngActiveSrc?: string;
arcPngFrameCount?: 11 | 21;
arcPngDirection?: 'clockwise' | 'counter-clockwise';
arcPngFrames?: string[];
```

All fields are optional so existing FVWF documents require no migration.

## Risk Matrix

| Risk | Severity | Control |
|---|---:|---|
| Existing native Arc changes | Critical | Default to `native`; regression tests assert unchanged generator output |
| Existing HTML gauge breaks | Critical | Add PNG workflow beside, not inside, the parser |
| Wrong layer order | High | Deterministic `gaugePairId` siblings and explicit z-index tests |
| Canvas/watch mismatch | High | One shared frame generator; package inspection tests |
| ZPK bloat | High | 11-frame default, 21-frame cap in v1, byte estimate in UI |
| Incorrect mask direction | Medium | Golden pixel tests for both directions and partial arcs |
| Stale sibling duplication | Medium | Stable asset prefixes and scoped replacement |
| AOD duplication | Medium | Existing main/AOD asset regeneration rules; explicit tests |

## Acceptance Criteria

1. A user can build a Gauge Pointer Set from separate background and needle PNGs.
2. Optional switcher frames and foreground PNG create correctly ordered siblings.
3. The needle rotates independently while all other layers remain static.
4. A native Arc from an old FVWF generates the same native Zepp widget logic.
5. A PNG Arc accepts track + active PNGs and previews 0%, intermediate, and 100%.
6. PNG Arc exports deterministic referenced PNG frames with no missing assets.
7. Frame direction matches configured start/end/direction.
8. Frame-count and estimated asset bytes are visible before export.
9. TypeScript, focused tests, private build, ZPK inspection, and live private-route
   verification pass.

## Deployment

This is private Studio/shared ZPK core functionality. Deploy only through:

```text
npm run deploy:full:private
```

Push destination: `origin/main`. The public storefront remote is not touched.

