# Tasks 115 — Surface 3D Effect

## Status: T1 READY

---

## T1 — Extend type system
**File:** `app/src/types/visualSpec.ts`

- Add `Surface3DParams` interface
- Add `surface3D?: Surface3DParams | null` to `AppearanceItem`

**Gate:** TypeScript compiles with zero errors.

---

## T2 — Renderer: build SVG filter + wire it
**File:** `app/src/pipeline/visualRenderer.ts`

- Add `buildSurface3DFilterDef(ctx, params)` helper
- In `renderElement()`, resolve `item?.surface3D` and apply filter ref to `<g>` wrapper
- Cache key = `JSON.stringify(surface3D)` in `ctx.filterRefs`

**Gate:** Renderer produces valid SVG with `<filter>` defs when `surface3D` is set.

---

## T3 — UI controls panel
**File:** TBD (appearance editor component — identified during T3 execution)

- Add collapsible "Surface 3D" section in layer appearance editor
- Controls: Emboss/Engrave/Off toggle + Light Direction + Depth + Crispness sliders
- Visible for ALL layer kinds
- On change → update `appearance[id].surface3D` → trigger preview re-render

**Gate:** Controls appear in UI, changing them updates preview visually.

---

## T4 — Validation smoke test
- Manually test emboss on: text layer, image layer, shape layer
- Manually test engrave on same
- Test param extremes: depth=1 vs 20, crispness=0 vs 1, lightAngle=0/90/180/270
- Confirm baked PNG in ZPK looks correct

**Gate:** All 6 layer+mode combos render correctly. Baked PNG matches preview.
