# Spec 104 — Hub-Ratio Proportional Sizing for Analog Clock Pointers

## Problem
Analog clock hand designs come as 4 HTML layers (hour, minute, second, hub) sized proportionally
to each other by the designer. Currently the save pipeline bakes each hand at fixed canonical
sizes (22×140, 16×200, 8×240) ignoring the designer's intended proportions. The result:
hands on canvas are the wrong relative size and pivot placement is inconsistent.

## Solution: Hub-as-Reference Ratio System
Hub is the reference unit. All hand dimensions and pivots are stored as ratios relative to
the hub's natural art size. Canvas derives actual pixel dimensions from the standard hub size
× stored ratios — exactly as gauge pointers store `pivotX/Y` as 0–1 ratios.

---

## Data Model Changes

### New fields on `CustomHandRecord` (types/pipeline.ts + customHandStore.ts)

```ts
// Ratio-based geometry (Spec 104). Present on records saved after this spec.
// All ratios relative to hub art size (hubArtW × hubArtH).
hourWidthRatio?: number;   // hourArtW / hubArtW
hourHeightRatio?: number;  // hourArtH / hubArtH
hourPivotXRatio?: number;  // pivot X within hour art image (0–1)
hourPivotYRatio?: number;  // pivot Y within hour art image (0–1)

minuteWidthRatio?: number;
minuteHeightRatio?: number;
minutePivotXRatio?: number;
minutePivotYRatio?: number;

secondWidthRatio?: number;
secondHeightRatio?: number;
secondPivotXRatio?: number;
secondPivotYRatio?: number;
```

Old fields (`hourPosX`, `hourPosY`, etc.) are kept for backward compat fallback.

---

## Save Pipeline (`customHandStore.ts` — `saveCustomHandStyle`)

### Step 1: Measure hub art size
Already done via `measureHubArtSize(hubSvg)` → `hubSize: { width, height }`.

### Step 2: Measure each hand art size
After `renderHandToPngWithPivot` returns, the cropped art bounds are available in
`hourLayer.artBoundsY` (and X equivalent if added). Also detect natural art W from SVG.

For each hand, after rendering to PNG, run `measureHandArtSize(svgCode)`:
```ts
async function measureHandArtSize(svgCode: string): Promise<{ w: number; h: number }>
```
Renders SVG, detects opaque bounds, returns `{ w: cropW, h: cropH }` in natural pixels.

### Step 3: Compute ratios
```ts
const hourWidthRatio  = hubArtW > 0 ? hourArt.w / hubArtW : 1;
const hourHeightRatio = hubArtH > 0 ? hourArt.h / hubArtH : 1;
const hourPivotXRatio = hourArt.w > 0 ? hourPosX / hourArt.w : 0.5;  // pivot within art
const hourPivotYRatio = composerAxis.hour;  // final effective pivot (0–1) from tip/tail — see Spec 105
// Same for minute, second
```

`hourPivotYRatio` comes directly from `composerAxis[hand]` (the final tip/tail-adjusted value
stored after Spec 105 pipeline). `hourPivotXRatio` = 0.5 (center, or from X marker if present).

### Step 4: Store in record
Add the 12 new ratio fields to the `CustomHandRecord` object before IDB `.put()`.

---

## Canvas Render (`InteractiveCanvas.tsx` — `drawTimePointer`)

### Ratio-aware render path (new, runs when ratio fields present)

```ts
if (customRecord?.hourWidthRatio !== undefined) {
  // Hub display size = record.coverWidth (already baked to natural hub art size)
  const hubW = customRecord.coverWidth ?? 30;
  const hubH = customRecord.coverHeight ?? 30;
  const refSize = Math.max(hubW, hubH);  // or use hubH as reference

  // Derived hand sizes
  const hourW = Math.round(refSize * customRecord.hourWidthRatio);
  const hourH = Math.round(refSize * customRecord.hourHeightRatio);
  // Pivot within the drawn image
  pivotX = (customRecord.hourPivotXRatio ?? 0.5) * hourW;
  pivotY = (customRecord.hourPivotYRatio ?? 0.85) * hourH;
  // baseW/baseH override for this draw call
  baseW = hourW; baseH = hourH;
}
```

Old path (`customRecord.hourPosX/Y`) remains as fallback for old records.

### Image drawing
The baked PNG in IDB (`hourDataUrl`) is drawn at the new `drawW = hourW × sc.wid`,
`drawH = hourH × sc.len` — replacing `def.w × sc.wid` / `def.h × sc.len`.

---

## Backward Compatibility
- Old records without ratio fields → fall through to current `hourPosX/Y` + `def.w/h` logic
- No IDB migration needed

## Files Changed
- `app/src/types/pipeline.ts` — add 12 ratio fields to `CustomHandRecord`
- `app/src/lib/customHandStore.ts` — measure art sizes, compute ratios, store them
- `app/src/components/InteractiveCanvas.tsx` — ratio-aware render path in `drawTimePointer`
