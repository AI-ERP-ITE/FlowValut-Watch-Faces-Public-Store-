# Spec 028 — Universal Drop Shadow Engine: Technical Specification

---

## S1. Type System

### S1.1 — Add `dropShadow` to `WatchFaceElement`

**File:** `src/types/index.ts`

Add after the `engraveFrame` block:

```typescript
// Universal drop shadow (canvas preview + ZPK PNG baking for simple elements)
dropShadow?: {
  color: string;    // CSS hex e.g. '#000000'
  opacity: number;  // 0–1
  blur: number;     // px, 0–40
  offsetX: number;  // px, -30 to +30
  offsetY: number;  // px, -30 to +30
};
```

**Not applied to:** `TIME_POINTER` (uses `handShadow`) and `engraveFrame` FILL_RECT (uses bevel shadows).

---

## S2. Canvas Preview

### S2.1 — `applyShadow()` and `clearShadow()` helpers

**File:** `src/components/InteractiveCanvas.tsx`

Add two small helpers near the top of the file (above the element draw functions):

```typescript
function applyShadow(ctx: CanvasRenderingContext2D, el: WatchFaceElement) {
  const s = el.dropShadow;
  if (!s || !el.dropShadow) return;
  const { r, g, b } = hexToRgb(s.color);
  ctx.shadowColor = `rgba(${r},${g},${b},${s.opacity})`;
  ctx.shadowBlur = s.blur;
  ctx.shadowOffsetX = s.offsetX;
  ctx.shadowOffsetY = s.offsetY;
}

function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}
```

### S2.2 — Apply in each element case

**File:** `src/components/InteractiveCanvas.tsx` — in the main `drawElement()` function

For every element case (except `TIME_POINTER` and `engraveFrame` FILL_RECT), wrap the draw call:

```typescript
ctx.save();
applyShadow(ctx, el);

// ... existing draw code for this element type ...

clearShadow(ctx);
ctx.restore();
```

**Elements affected:**
- `TEXT` — wrap around `ctx.fillText()`
- `IMG` — wrap around `ctx.drawImage()` or placeholder
- `ARC_PROGRESS` — wrap around `drawArc()`
- `CIRCLE` — wrap around `ctx.arc()` fill
- `FILL_RECT` (non-engrave only) — wrap around `ctx.fillRect()`
- `STROKE_RECT` — wrap around `ctx.strokeRect()`
- `IMG_TIME`, `IMG_DATE`, `IMG_WEEK`, `TEXT_IMG` — wrap around `drawDigitElement()`
- `IMG_LEVEL`, `IMG_STATUS`, `IMG_PROGRESS`, `IMG_ANIM` — wrap around their draw calls
- `BUTTON`, `IMG_CLICK`, `DATE_POINTER` — wrap around placeholder or draw calls

---

## S3. PropertyPanel UI

### S3.1 — "Drop Shadow" section

**File:** `src/components/PropertyPanel.tsx`

Add a new collapsible `<Section label="Drop Shadow">` to the main element panel. Show it for all types **except** `TIME_POINTER` and elements with `engraveFrame` set.

```typescript
const canHaveShadow = !['TIME_POINTER'].includes(element.type) && !element.engraveFrame;
```

**Section contents:**

```
[Toggle Switch] Enable Shadow

When enabled:
  Color:    [color picker] [hex input]
  Opacity:  [slider 0–100%]
  Blur:     [slider 0–40px]
  Offset X: [slider -30 to +30px]  
  Offset Y: [slider -30 to +30px]
```

**Default values when enabling:**
```typescript
{ color: '#000000', opacity: 0.6, blur: 8, offsetX: 3, offsetY: 3 }
```

When switch toggled OFF → `update({ dropShadow: undefined })`.

---

## S4. ZPK Export — PNG Baking (Phase 1 Elements)

### S4.1 — Which elements get baked shadow in ZPK

Phase 1 baking applies to: `IMG`, `FILL_RECT` (non-engrave), `STROKE_RECT`, `CIRCLE`

These elements are already exported as PNG assets or can be converted without breaking the widget structure.

### S4.2 — Baking algorithm

**File:** `src/StudioApp.tsx` — in the ZPK build flow (near `renderEngraveFrameToPng`)

Add `renderElementWithShadowToPng(el: WatchFaceElement): string | null`:

```typescript
function renderElementWithShadowToPng(el: WatchFaceElement): string | null {
  if (!el.dropShadow) return null;
  const s = el.dropShadow;
  
  // Extra padding to contain shadow bleed
  const pad = s.blur + Math.abs(s.offsetX) + Math.abs(s.offsetY) + 4;
  
  const off = document.createElement('canvas');
  off.width  = el.bounds.width  + pad * 2;
  off.height = el.bounds.height + pad * 2;
  const ctx = off.getContext('2d')!;
  
  // Apply shadow
  const { r, g, b } = hexToRgb(s.color);
  ctx.shadowColor   = `rgba(${r},${g},${b},${s.opacity})`;
  ctx.shadowBlur    = s.blur;
  ctx.shadowOffsetX = s.offsetX;
  ctx.shadowOffsetY = s.offsetY;
  
  // Draw the element content at offset=pad (centered in padded canvas)
  // ... element-specific draw logic ...
  
  return off.toDataURL('image/png');
}
```

The baked PNG is then injected into the ZPK assets folder as `shadow_<elementName>.png`, and the widget in the generated code uses that PNG as an `hmUI.widget.IMG` instead of the original asset reference.

### S4.3 — ZPK coordinate adjustment

When a shadow PNG is baked, the canvas has extra `pad` pixels on each side. The widget's `x`/`y` must be offset by `-pad` to keep the element visually in the same position.

```
widget x = element.bounds.x - pad
widget y = element.bounds.y - pad
widget w = element.bounds.width  + pad * 2
widget h = element.bounds.height + pad * 2
```

---

## S5. No ZPK Changes for Phase 1 (TEXT, ARC_PROGRESS, Digit Elements)

For `TEXT`, `ARC_PROGRESS`, `IMG_TIME`, `IMG_DATE`, `IMG_WEEK`, `TEXT_IMG`, `IMG_STATUS`, `IMG_LEVEL`, `IMG_PROGRESS`, `IMG_ANIM`:
- Shadow is **visible in canvas preview** only
- ZPK export is unchanged — shadow is not baked for these types in Phase 1
- A note in the PropertyPanel shadow section: "⚠ Shadow is preview-only for this element type — not included in exported .zpk"

---

## S6. Canvas Bleed Reset (Critical)

Every `applyShadow` must be paired with `clearShadow` after the draw. Canvas shadow state is global — failing to reset it bleeds the shadow onto every subsequent element render.

Pattern to enforce:
```typescript
ctx.save();
applyShadow(ctx, el);
// draw
clearShadow(ctx); // before ctx.restore() to be safe
ctx.restore();
```
