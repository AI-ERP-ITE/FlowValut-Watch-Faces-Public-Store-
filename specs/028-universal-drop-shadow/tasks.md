# Spec 028 — Universal Drop Shadow Engine: Tasks

## Phase 1 — Canvas Preview + Simple ZPK Baking

---

### T01 — Add `dropShadow` type to `WatchFaceElement`
**File:** `src/types/index.ts`
- Add after `engraveFrame` block:
  ```typescript
  dropShadow?: {
    color: string;    // CSS hex
    opacity: number;  // 0–1
    blur: number;     // px 0–40
    offsetX: number;  // px -30 to +30
    offsetY: number;  // px -30 to +30
  };
  ```

---

### T02 — Add `hexToRgb`, `applyShadow`, `clearShadow` helpers to InteractiveCanvas
**File:** `src/components/InteractiveCanvas.tsx`
- Add `hexToRgb(hex)` utility (hex → {r,g,b})
- Add `applyShadow(ctx, el)` — reads `el.dropShadow`, sets all `ctx.shadow*` properties
- Add `clearShadow(ctx)` — resets `ctx.shadow*` to transparent/0

---

### T03 — Apply shadow to `TEXT` elements in canvas render
**File:** `src/components/InteractiveCanvas.tsx`
- Wrap the `TEXT` case draw code in `ctx.save()` / `applyShadow()` / draw / `clearShadow()` / `ctx.restore()`

---

### T04 — Apply shadow to `IMG` elements in canvas render
**File:** `src/components/InteractiveCanvas.tsx`
- Wrap `IMG` case (both icon path and placeholder) with shadow helpers

---

### T05 — Apply shadow to `ARC_PROGRESS` in canvas render
**File:** `src/components/InteractiveCanvas.tsx`
- Wrap `drawArc(ctx, el)` call with shadow helpers

---

### T06 — Apply shadow to `CIRCLE` in canvas render
**File:** `src/components/InteractiveCanvas.tsx`
- Wrap `CIRCLE` draw with shadow helpers

---

### T07 — Apply shadow to `FILL_RECT` (non-engrave) in canvas render
**File:** `src/components/InteractiveCanvas.tsx`
- In the `FILL_RECT` case, only apply shadow when `!el.engraveFrame`

---

### T08 — Apply shadow to `STROKE_RECT` in canvas render
**File:** `src/components/InteractiveCanvas.tsx`
- Wrap `STROKE_RECT` draw with shadow helpers

---

### T09 — Apply shadow to digit elements (`IMG_TIME`, `IMG_DATE`, `IMG_WEEK`, `TEXT_IMG`) in canvas render
**File:** `src/components/InteractiveCanvas.tsx`
- Wrap `drawDigitElement()` call with shadow helpers

---

### T10 — Apply shadow to remaining element types in canvas render
**File:** `src/components/InteractiveCanvas.tsx`
- Apply shadow to: `IMG_LEVEL`, `IMG_STATUS`, `IMG_PROGRESS`, `IMG_ANIM`, `BUTTON`, `IMG_CLICK`, `DATE_POINTER`
- These all fall through to `drawPlaceholder()` or simple draw — wrap with shadow helpers

---

### T11 — Add "Drop Shadow" section to PropertyPanel
**File:** `src/components/PropertyPanel.tsx`
- Add after existing sections (before the "Element Frame" add toggle at bottom)
- Show for all types except `TIME_POINTER`; also hide when `element.engraveFrame` is set
- Contains:
  - Enable toggle (Switch): when toggled ON sets default `{ color:'#000000', opacity:0.6, blur:8, offsetX:3, offsetY:3 }`, OFF sets `undefined`
  - Color picker + hex input
  - Opacity slider (0–100, displayed as %)
  - Blur slider (0–40 px)
  - Offset X slider (-30 to +30 px)
  - Offset Y slider (-30 to +30 px)
  - Warning note for preview-only types (TEXT, ARC_PROGRESS, digit elements): "⚠ Preview only — not baked into .zpk"

---

### T12 — ZPK PNG baking for `IMG` elements with shadow
**File:** `src/StudioApp.tsx`
- Add `renderElementWithShadowToPng(el, imgElement?)` function
- For `IMG` type with `dropShadow`: draw image onto padded offscreen canvas with `ctx.shadow*`, export PNG
- Inject into ZPK assets as `shadow_<safeName>.png`
- In code generator: use the shadow PNG with adjusted x/y/w/h (subtract pad from position, add 2*pad to size)

---

### T13 — ZPK PNG baking for `FILL_RECT` (non-engrave) with shadow
**File:** `src/StudioApp.tsx`
- Extend the same baking function for `FILL_RECT`
- Draw filled rect on padded offscreen canvas with shadow, export PNG

---

### T14 — ZPK PNG baking for `STROKE_RECT` with shadow
**File:** `src/StudioApp.tsx`
- Same pattern as T13 for stroke rect

---

### T15 — ZPK PNG baking for `CIRCLE` with shadow
**File:** `src/StudioApp.tsx`
- Draw filled circle on padded offscreen canvas with shadow, export PNG

---

## Verification Checklist

- [ ] `npm run build` succeeds — no TypeScript errors
- [ ] Canvas preview: every element type shows shadow when configured
- [ ] Shadow state doesn't bleed between elements (each element isolated with save/restore + clearShadow)
- [ ] TIME_POINTER: `dropShadow` field not shown in PropertyPanel (uses handShadow instead)
- [ ] engraveFrame FILL_RECT: `dropShadow` not shown in PropertyPanel
- [ ] ZPK export: IMG/FILL_RECT/STROKE_RECT/CIRCLE shadow baked into PNG correctly
- [ ] ZPK export: baked PNG widget x/y adjusted for shadow padding
- [ ] TEXT/ARC_PROGRESS: shadow visible in preview, warning shown in panel, ZPK unchanged
- [ ] Deploy per protocol
