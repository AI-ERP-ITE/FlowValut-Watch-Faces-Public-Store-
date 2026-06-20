# Spec 094 — Proportional Corner Resize + Image Layer Photo Editor

## Overview
Two independent UI fixes for the Studio canvas and Image Layer panel.

---

## Fix 1 — Proportional Corner Resize (Option A)

### Behaviour
- Corner handles (TL, TR, BL, BR): always resize proportionally (lock aspect ratio).
- Side/edge handles (TC, BC, ML, MR): always free-stretch (no lock).
- No shift key required. Corners = proportional by default, always.
- Works for single-layer selection and multi-layer selection.

### Implementation
File: `app/src/components/InteractiveCanvas.tsx`

In `applyResize(snap, handle, dx, dy)`:
- Detect if handle is a corner: `handle.length === 2` and both chars are in `{T,B}` x `{L,R}`.
- If corner: compute aspect ratio from `snap.width / snap.height`. Apply the larger of dx/dy movement to both axes so proportions stay locked. Fix anchor at opposite corner.

In the multi-select sibling scaling block (lines ~409–450):
- When primary resize is proportional, `scaleX === scaleY`. Siblings already use scaleX/scaleY, so no extra change needed there.

### Corner detection
```
const CORNERS = new Set(['TL','TR','BL','BR']);
const isCorner = CORNERS.has(handle);
```

### Proportional resize logic (corner case)
```
const aspectRatio = snap.width / snap.height; // lock this
// Determine dominant axis from drag distance
if (handle.includes('R') || handle.includes('L')) {
  // horizontal drag leads; derive height
  const newW = Math.max(MIN, handle.includes('R') ? snap.width + dx : snap.width - dx);
  const newH = Math.max(MIN, newW / aspectRatio);
  // then set x/y based on which corner is fixed
} else {
  // vertical drag leads; derive width
}
```

---

## Fix 2 — Image Layer Photo Editor Sliders

### Behaviour
When `selectedElement.type === 'image_layer'` in the right panel:
- Show the same photo-editing sliders as `BackgroundPhotoEditor` has:
  - Exposure (−100…+100)
  - Brightness (−100…+100)
  - Contrast (−100…+100)
  - Highlights (−100…+100)
  - Shadows (−100…+100)
  - Saturation (−100…+100)
  - Hue (−180…+180)
  - Temperature (−100…+100)
  - Tint (−100…+100)
  - Sharpness (0…100)
  - Vignette (0…100)
- Sliders stored in `element.params.photoEdit` (object, same shape as `BackgroundPhotoEditor` state).
- Applied live to the image in the canvas renderer for `image_layer` type.

### Data shape
```ts
type ImageLayerPhotoEdit = {
  exposure: number;     // −100…+100, default 0
  brightness: number;   // −100…+100, default 0
  contrast: number;     // −100…+100, default 0
  highlights: number;   // −100…+100, default 0
  shadows: number;      // −100…+100, default 0
  saturation: number;   // −100…+100, default 0
  hue: number;          // −180…+180, default 0
  temperature: number;  // −100…+100, default 0
  tint: number;         // −100…+100, default 0
  sharpness: number;    //    0…100, default 0
  vignette: number;     //    0…100, default 0
};
```

### Implementation
Files:
1. `app/src/ParametricPage.tsx` — add sliders UI after the Opacity row inside the `image_layer` block.
2. `app/src/components/ParametricWatchRenderer.tsx` (or wherever image_layer is drawn) — apply CSS filter + pixel ops using the same logic as `BackgroundPhotoEditor.applyEdits()`.

### Slider UI pattern (same for all 11 params)
```tsx
<label className="block space-y-1">
  <span className="text-[11px] text-zinc-400">Brightness {val}</span>
  <input type="range" min={-100} max={100} step={1}
    value={val}
    onChange={e => setImgParam('photoEdit', { ...photoEdit, brightness: Number(e.target.value) })}
    className="w-full"
  />
</label>
```

### Renderer
Reuse `applyPhotoEdit(canvas, params)` extracted from `BackgroundPhotoEditor`. If not already extracted, extract the offscreen-canvas processing function into a shared util: `app/src/lib/photoEditUtils.ts`. Then import and call it in both `BackgroundPhotoEditor` and the `image_layer` renderer.

---

## Tasks

- [ ] T1: Add proportional corner resize to `applyResize()` in InteractiveCanvas.tsx
- [ ] T2: Add photo edit sliders UI to image_layer panel in ParametricPage.tsx
- [ ] T3: Extract photo edit processing into shared util `app/src/lib/photoEditUtils.ts`
- [ ] T4: Apply photo edit util to image_layer canvas rendering
- [ ] T5: Smoke test both features in dev server

## Scope
- SHARED CORE TASK (affects studio canvas + parametric page)
- No deploy until user confirms smoke test passes
