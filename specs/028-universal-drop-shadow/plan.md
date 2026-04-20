# Spec 028 — Universal Drop Shadow Engine: Plan

## Overview

Add a generic drop-shadow effect to every element type. The TIME_POINTER already has `handShadow`/`handGlow`. The engrave FILL_RECT uses bevel edge shadows. All other elements (TEXT, IMG, ARC_PROGRESS, CIRCLE, STROKE_RECT, TEXT_IMG, IMG_TIME, IMG_DATE, IMG_WEEK, IMG_STATUS, IMG_LEVEL, IMG_PROGRESS, IMG_ANIM, BUTTON, IMG_CLICK, DATE_POINTER) have zero shadow support.

---

## Two Layers of the Feature

### Layer 1 — Canvas Preview (Easy)
Apply `ctx.shadowColor / ctx.shadowBlur / ctx.shadowOffsetX / ctx.shadowOffsetY` before each element is drawn in `InteractiveCanvas.tsx`. This gives real-time shadow preview for all element types with ~10 lines of shared helper code.

### Layer 2 — ZPK Export (Complex)
Zepp OS widget params have **no native shadow support**. Shadows must be **baked into the PNG asset** at export time. Strategy differs by element complexity:

| Element Group | ZPK Export Strategy |
|---|---|
| `IMG`, `FILL_RECT`, `STROKE_RECT`, `CIRCLE`, `BUTTON`, `IMG_CLICK` | Pre-render to offscreen canvas with shadow → export as PNG → use `hmUI.widget.IMG` |
| `TEXT` | Convert to offscreen canvas render → export as PNG → use `hmUI.widget.IMG` instead of TEXT widget |
| `ARC_PROGRESS` | Render arc + shadow to offscreen canvas → export as PNG → use `hmUI.widget.IMG` |
| `IMG_TIME`, `IMG_DATE`, `IMG_WEEK`, `TEXT_IMG` (digit elements) | Bake shadow into each digit sprite PNG |
| `TIME_POINTER` | Already handled via `handShadow` — no change needed |

---

## Shadow Config Schema

```typescript
dropShadow?: {
  color: string;      // CSS hex e.g. '#000000'
  opacity: number;    // 0–1, controls rgba alpha
  blur: number;       // px, 0–40
  offsetX: number;    // px, -30 to +30
  offsetY: number;    // px, -30 to +30
}
```

Stored directly on `WatchFaceElement`. Optional — `undefined` means no shadow.

---

## Phased Delivery

### Phase 1 (This Spec) — Canvas Preview + Simple ZPK Elements
- Canvas preview for ALL element types
- ZPK baking for: `IMG`, `FILL_RECT` (non-engrave), `STROKE_RECT`, `CIRCLE`
- Does NOT change TEXT widget, ARC_PROGRESS, or digit elements in ZPK (shadow visible in preview only)

### Phase 2 (Future) — Full ZPK Baking
- TEXT → baked PNG in ZPK
- ARC_PROGRESS → baked PNG in ZPK
- Digit elements (IMG_TIME etc.) → baked digit sprites

---

## Files Touched (Phase 1)

| File | Change |
|---|---|
| `src/types/index.ts` | Add `dropShadow?` to `WatchFaceElement` |
| `src/components/InteractiveCanvas.tsx` | Add `applyShadow()` / `clearShadow()` helpers, call before/after each element draw |
| `src/components/PropertyPanel.tsx` | Add "Drop Shadow" section to all eligible element types |
| `src/StudioApp.tsx` | In ZPK pre-render: bake shadow into PNG for IMG/FILL_RECT/STROKE_RECT/CIRCLE elements |
| `src/lib/jsCodeGeneratorV2.ts` | No change needed for Phase 1 (shadow already baked into PNG) |
| `src/lib/jsCodeGenerator.ts` | No change needed for Phase 1 |

---

## Constraints & Edge Cases

- `TIME_POINTER`: already has `handShadow` — skip `dropShadow` for this type to avoid conflict
- `engraveFrame` FILL_RECT: already has its own bevel shadow — skip `dropShadow` on these
- Shadow must be reset to `transparent`/`0` after each element draw — canvas shadow state bleeds
- ZPK PNG baking needs extra canvas padding (shadow blur + offset can exceed element bounds)
- Opacity is implemented as rgba alpha in the shadow color string: `rgba(r,g,b,opacity)`
