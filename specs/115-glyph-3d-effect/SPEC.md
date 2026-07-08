# Spec 115 — Surface 3D Effect (Emboss / Engrave on Any Layer: Text, Image, Shape)

## Status: PROPOSED — awaiting approval before any code change

---

## 1. Problem Statement

Currently, the visual renderer supports effects (`shadow`, `glow`, `blur`) applied at the
**element wrapper** level. These affect the element's outer silhouette and drop shadow.

There is no way to apply a **surface 3D illusion to any layer's own shape** — meaning a
digit, a static image, an icon, or a background shape cannot appear raised (emboss) or
sunken (engrave) as if its surface were carved or extruded.

The user wants: given **any layer** (text, image, shape), apply a surface 3D lighting effect
with user-controllable parameters:
- `lightAngleDeg` — where the light source sits around the clock face
- `depth` — how steep/pronounced the 3D surface looks
- `crispness` — sharpness of the highlight/shadow edge (soft vs. hard)

---

## 2. Current Architecture (Relevant Parts)

### `app/src/types/visualSpec.ts`
```ts
export type FilterKind = 'shadow' | 'glow' | 'blur' | null;

export interface AppearanceItem {
  id: string;
  fill: Fill;
  stroke: Stroke;
  opacity?: number;
  texture?: Texture;
  blendMode?: BlendMode;
  clipPath?: string | null;
  filter?: FilterKind;          // ← current filter, no params
}
```

### `app/src/pipeline/visualRenderer.ts`
- `buildFilterDef(ctx, filterKind)` → generates a shared, parameterless `<filter>` in SVG `<defs>`
- Filter is applied to the `<g>` wrapper of every element that has that `filterKind`
- Works fine for shadow/glow/blur (they don't need per-element params)

### Rendering pipeline output
SVG → rasterised PNG → baked into ZPK asset. So any SVG filter effect gets baked correctly
at build time. No watch-device rendering needed.

---

## 3. Proposed Architecture

### 3a. New Types (`visualSpec.ts`)

Add a new dedicated params interface — **separate from existing `FilterKind`** to avoid
breaking the existing simple-filter path:

```ts
export interface Surface3DParams {
  mode: 'emboss' | 'engrave';
  lightAngleDeg: number;   // 0–360, 0 = right, 90 = down, 270 = up (CSS convention)
  depth: number;           // 1–20, maps to SVG surfaceScale
  crispness: number;       // 0–1, controls specularExponent + blur stdDeviation
}
```

Extend `AppearanceItem`:
```ts
export interface AppearanceItem {
  ...existing fields...
  surface3D?: Surface3DParams | null;  // NEW — applies to ANY layer kind
}
```

> **Why universal?** The SVG filter operates on `SourceAlpha` — the alpha channel of
> whatever is drawn. For text, alpha = glyph shape. For an image PNG, alpha = image
> transparency mask. For a solid shape, alpha = shape boundary. Same filter, same
> parameters — works on all.

### 3b. SVG Filter Strategy

Use SVG `feSpecularLighting` + `feDiffuseLighting` driven by the **alpha channel as a bump
map**. This means the glyph's own shape defines the 3D surface — no external normal map
needed.

**Emboss filter (raised):**
```xml
<filter id="..." x="-20%" y="-20%" width="140%" height="140%">
  <!-- blur alpha to create smooth bump -->
  <feGaussianBlur in="SourceAlpha" stdDeviation="{blurSD}" result="bump"/>
  <!-- specular highlight -->
  <feSpecularLighting in="bump" surfaceScale="{depth}" specularConstant="0.6"
      specularExponent="{specExp}" lighting-color="white" result="spec">
    <feDistantLight azimuth="{azimuth}" elevation="45"/>
  </feSpecularLighting>
  <feComposite in="spec" in2="SourceAlpha" operator="in" result="specMasked"/>
  <!-- diffuse base shading -->
  <feDiffuseLighting in="bump" surfaceScale="{depth}" diffuseConstant="0.8"
      lighting-color="white" result="diff">
    <feDistantLight azimuth="{azimuth + 180}" elevation="30"/>
  </feDiffuseLighting>
  <feComposite in="diff" in2="SourceAlpha" operator="in" result="diffMasked"/>
  <!-- composite onto original -->
  <feComposite in="SourceGraphic" in2="specMasked" operator="arithmetic" k1="0" k2="1" k3="0.8" k4="0" result="lit"/>
  <feBlend in="lit" in2="diffMasked" mode="multiply"/>
</filter>
```

**Engrave filter (sunken):** same filter but `azimuth` rotated 180° (light comes from
opposite side), making ridges look inverted.

**Parameter mappings:**
| User param | SVG param | Formula |
|---|---|---|
| `lightAngleDeg` | `feDistantLight azimuth` | direct (mod 360) |
| `depth` | `surfaceScale` | `depth * 1.0` (range 1–20) |
| `crispness` | `specularExponent` | `lerp(5, 60, crispness)` |
| `crispness` | `feGaussianBlur stdDeviation` | `lerp(3.0, 0.5, crispness)` |

### 3c. Renderer Changes (`visualRenderer.ts`)

Since these filters are **parameterized per-element** (unlike the shared shadow/glow/blur),
the `buildFilterDef` function must generate a **unique filter per unique param set**.

Cache key = `JSON.stringify(surface3D)` → stored in `ctx.filterRefs`.

A new helper `buildSurface3DFilterDef(ctx, params)` is added alongside `buildFilterDef`.

In `renderElement()`, after the existing `filterRef` is resolved, check `item?.surface3D`
and resolve via `buildSurface3DFilterDef`. The returned `filter` attribute is applied to the
`<g>` wrapper — same as existing filter path.

No kind-guard needed — the effect is valid for all layer kinds.

### 3d. UI Changes (Parametric Page)

In the layer appearance editor (wherever `FilterKind` controls currently live), add a new
collapsible section **"Surface 3D"** — visible for **all layer kinds** (text, image, shape).

Controls:
- Toggle: Emboss / Engrave / Off  
- Slider: Light Direction (0–360°, with a circular dial or slider)
- Slider: Depth (1–20)
- Slider: Crispness (0–1, displayed as 0–100%)

On change → updates `appearance[id].surface3D` in spec state → triggers re-render
preview.

---

## 4. What Does NOT Change

- `FilterKind` type itself is not modified (no breaking change to existing specs)
- Existing `buildFilterDef()` for shadow/glow/blur is untouched
- ZPK bake pipeline unchanged — SVG rasterisation already handles filter effects
- No Zepp OS runtime changes needed (effect is baked into PNG)
- AOD rules: glyph3D effect is baked into asset, so no AOD conflict

---

## 5. Affected Files

| File | Change |
|---|---|
| `app/src/types/visualSpec.ts` | Add `Surface3DParams`, extend `AppearanceItem` |
| `app/src/pipeline/visualRenderer.ts` | Add `buildSurface3DFilterDef()`, call in `renderElement()` |
| `app/src/[UI component for appearance]` | Add Surface 3D controls panel (all layer kinds) |

The UI component file needs to be identified in task execution phase.

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| SVG filter not rasterised correctly at export | Test bake output visually with each parameter combo |
| Filter too slow in live preview (canvas) | Preview uses SVG in browser — native SVG filters are GPU-accelerated, should be fast |
| Filter on opaque shape (no alpha) looks flat | Acceptable — user can adjust depth/crispness; effect relies on alpha boundary edges |
