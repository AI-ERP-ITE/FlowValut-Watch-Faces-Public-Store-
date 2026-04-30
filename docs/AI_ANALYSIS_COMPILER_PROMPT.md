# Visual Envelope — Authoritative AI Compiler Spec

> **Canonical pipeline.** This document defines the JSON contract the in-app
> Compiler page accepts. The chat-side analysis is driven by the Spec Kit
> prompts under `.github/prompts/speckit.compile.*` (master, inventory,
> geometry, appearance, audit, patch, emit). Their final emitted artifact is
> the **Visual Envelope** described here. Paste that envelope into the
> Compiler page; the in-app validator + renderer then enforce this spec
> deterministically.

---

## 0. Pipeline overview

```
image  ──▶  speckit.compile.master.prompt.md  (chat)
                │
                ├─▶ speckit.compile.inventory.agent.md   → InventoryDoc
                ├─▶ speckit.compile.geometry.agent.md    → GeometryEntry[]
                ├─▶ speckit.compile.appearance.agent.md  → AppearanceEntry[]
                ├─▶ speckit.compile.audit.agent.md       → ValidationReport
                └─▶ speckit.compile.emit.agent.md        → VisualEnvelope (JSON)
                                                              │
                                                              ▼
                                                    paste into CompilerPage
                                                              │
                                                  app/src/pipeline/visualValidator.ts   (gates G1–G6)
                                                  app/src/pipeline/visualRenderer.ts    (deterministic SVG)
```

The chat side is **purely visual**: shapes, fills, strokes, transforms,
layering. No watchface semantics (no hour hand, no bezel, no battery, no
complications). The renderer treats the envelope as a generic illustration.

---

## 1. Top-level shape

```ts
interface VisualEnvelope {
  inventory:  InventoryDoc;
  geometry:   GeometryEntry[];
  appearance: AppearanceEntry[];
}
```

Every element is identified by an opaque `id` matching the regex
`^[a-z][a-z0-9_]{0,63}$` (e.g. `el_001`, `bg_layer`, `dot_center`). The same
`id` set MUST appear identically in `inventory.elements`, `geometry`, and
`appearance`.

---

## 2. Inventory

```ts
interface InventoryDoc {
  canvas: { width: number; height: number; shape: 'rect' | 'circle' };
  elements: InventoryElement[];
}

interface InventoryElement {
  id: string;
  kind: 'shape' | 'text' | 'image' | 'group';
  bbox: { x: number; y: number; w: number; h: number };  // axis-aligned, canvas units
  zOrder: number;          // unique integer, ascending = drawn later (on top)
  groupId: string | null;  // parent group id, or null
}
```

Rules (gate **G2**):
- `id` unique across all elements.
- `zOrder` unique across all elements.
- If `groupId` is non-null it must reference an element with `kind: 'group'`.
- Group nesting is **flat** — a `group` element may not have `groupId` set
  (no nested groups in v1).
- Every `group` must have at least one child whose `groupId` points to it.

---

## 3. Geometry

```ts
type GeometryEntry =
  | GeometryCircle
  | GeometryArc
  | GeometryLine
  | GeometryRect
  | GeometryPolygon
  | GeometryPath
  | GeometryText
  | GeometryImage
  | GeometryGroup
  | GeometryInherit;
```

Each entry carries `id` plus a `shape` tag. Coordinates are in canvas units.

| shape     | required fields                                                            |
| --------- | -------------------------------------------------------------------------- |
| `circle`  | `cx`, `cy`, `r`                                                            |
| `arc`     | `cx`, `cy`, `rOuter`, `rInner`, `startAngle`, `endAngle` (deg, 0 = 3 o'clock, CW) |
| `line`    | `x1`, `y1`, `x2`, `y2`                                                     |
| `rect`    | `x`, `y`, `w`, `h`, optional `rx`                                          |
| `polygon` | `points: Array<{x,y}>` (≥3)                                                |
| `path`    | `d` (SVG path data)                                                        |
| `text`    | `x`, `y`, `content`, `fontSize`, optional `anchor` (`start`/`middle`/`end`), `fontFamily` |
| `image`   | `x`, `y`, `w`, `h`, `href` (data URI or asset id)                          |
| `group`   | (no shape geometry — children carry their own)                             |
| `inherit` | `{ id, inherit: true }` — renderer falls back to bbox + kind defaults      |

Optional on every non-inherit entry:

```ts
transform?: {
  rotateDeg?: number;
  rotateOrigin?: { x: number; y: number };
  translate?: { x: number; y: number };
  scale?: { x: number; y: number };
};
```

Gate **G3** validates numeric fields are finite, radii ≥ 0, polygons have ≥3
points, arc inner radius ≤ outer radius.

---

## 4. Appearance

```ts
type AppearanceEntry = AppearanceItem | AppearanceInherit;

interface AppearanceItem {
  id: string;
  fill: Fill;
  stroke: Stroke;
  opacity?: number;          // 0..1, applied to whole element
  blend?: BlendMode;         // 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  texture?: Texture;         // 'none' | 'brushed' | 'matte' | 'glossy' | 'metallic'
  clipPath?: string;         // id of another inventory element used as a clip mask
}
```

### Fill

```ts
type Fill =
  | { kind: 'solid';  color: HexColor; opacity?: number }
  | { kind: 'linear'; stops: GradientStop[]; angleDeg: number; opacity?: number }
  | { kind: 'radial'; cx: number; cy: number; r: number; stops: GradientStop[]; opacity?: number }
  | { kind: 'none' };

interface GradientStop { offset: number /* 0..1 */; color: HexColor; opacity?: number }
```

### Stroke

```ts
type Stroke =
  | 'none'
  | {
      color: HexColor;
      width: number;
      cap?: 'butt' | 'round' | 'square';
      join?: 'miter' | 'round' | 'bevel';
      dashArray?: number[];
      opacity?: number;
    };
```

`HexColor` matches `^#([0-9a-f]{6}|[0-9a-f]{8})$` (lowercase, 6 or 8 digit).
Gate **G4** enforces color format, fill kind discriminator, stroke width ≥ 0,
gradient stops in `[0,1]` and ≥2 stops, and that any `clipPath` id exists in
inventory.

`AppearanceInherit = { id, inherit: true }` — renderer applies the default
solid mid-grey fill, no stroke.

---

## 5. Cross-stage + vocabulary gates

- **G5 cross-stage:** `inventory.elements[].id` ⇔ `geometry[].id` ⇔
  `appearance[].id` must be identical sets. No extras, no missing ids.
- **G6 vocabulary:** the envelope must be **shape-only**. The validator
  rejects any of these tokens anywhere in the JSON (case-insensitive):

  ```
  bezel, dial, crown, pusher, subdial, complication,
  hour_hand, minute_hand, second_hand, pointer, tick, marker,
  numeral, screw, lume_pip,
  time_pointer, arc_progress, battery, steps, heart_rate,
  time_hour, time_minute, time_second
  ```

  Use neutral ids like `el_001`, `ring_outer`, `dot_a`, `text_top`. If you
  catch yourself naming for purpose, rename for shape.

---

## 6. Worked example

A 480×480 dark dial with a centred radial-gradient circle, a vertical line,
and a single text label.

```json
{
  "inventory": {
    "canvas": { "width": 480, "height": 480, "shape": "circle" },
    "elements": [
      { "id": "el_001", "kind": "shape", "bbox": { "x": 0,   "y": 0,   "w": 480, "h": 480 }, "zOrder": 0, "groupId": null },
      { "id": "el_002", "kind": "shape", "bbox": { "x": 40,  "y": 40,  "w": 400, "h": 400 }, "zOrder": 1, "groupId": null },
      { "id": "el_003", "kind": "shape", "bbox": { "x": 230, "y": 100, "w": 20,  "h": 280 }, "zOrder": 2, "groupId": null },
      { "id": "el_004", "kind": "text",  "bbox": { "x": 200, "y": 220, "w": 80,  "h": 40  }, "zOrder": 3, "groupId": null }
    ]
  },
  "geometry": [
    { "id": "el_001", "shape": "rect",   "x": 0, "y": 0, "w": 480, "h": 480 },
    { "id": "el_002", "shape": "circle", "cx": 240, "cy": 240, "r": 200 },
    { "id": "el_003", "shape": "line",   "x1": 240, "y1": 100, "x2": 240, "y2": 380 },
    { "id": "el_004", "shape": "text",   "x": 240, "y": 250, "content": "SAMPLE", "fontSize": 32, "anchor": "middle" }
  ],
  "appearance": [
    { "id": "el_001", "fill": { "kind": "solid", "color": "#0f172a" }, "stroke": "none" },
    { "id": "el_002", "fill": { "kind": "radial", "cx": 240, "cy": 240, "r": 200,
                                "stops": [
                                  { "offset": 0, "color": "#1e293b" },
                                  { "offset": 1, "color": "#0f172a" }
                                ] },
                       "stroke": { "color": "#475569", "width": 4 } },
    { "id": "el_003", "fill": { "kind": "none" },
                       "stroke": { "color": "#e2e8f0", "width": 6, "cap": "round" } },
    { "id": "el_004", "fill": { "kind": "solid", "color": "#e2e8f0" }, "stroke": "none" }
  ]
}
```

This same envelope is used as `SAMPLE_ENVELOPE` inside
`app/src/CompilerPage.tsx` and is what loads when the page first opens.

---

## 7. Pre-paste checklist

Before pasting into the Compiler page, confirm:

1. ☐ Top-level keys are exactly `inventory`, `geometry`, `appearance`.
2. ☐ `inventory.canvas` has `width`, `height`, `shape`.
3. ☐ Every `id` matches `^[a-z][a-z0-9_]{0,63}$` and is **shape-named**, not
   purpose-named.
4. ☐ `inventory.elements`, `geometry`, `appearance` contain the **same id
   set** (compare lengths and check pairwise).
5. ☐ Every `zOrder` is a unique integer.
6. ☐ Every `groupId` either is `null` or references a `kind: 'group'` element.
7. ☐ All colors are lowercase hex `#rrggbb` or `#rrggbbaa`.
8. ☐ Fills carry the right discriminator (`solid` / `linear` / `radial` /
   `none`); gradients have ≥2 stops with `offset ∈ [0,1]`.
9. ☐ Strokes are either `'none'` or `{ color, width }` (width ≥ 0).
10. ☐ `clipPath` references (if any) point to an existing inventory id.
11. ☐ JSON is valid (paste into a JSON linter if unsure) — the page also shows
    a parse error inline.
12. ☐ Forbidden vocabulary scan is clean (see §5).

If validator gates G1–G6 all return PASS, the **Compile Visual Envelope**
button activates. The renderer then emits a deterministic SVG into the
preview pane.

If any gate FAILS, copy the validation report **and** the envelope back into
chat using `use:speckit.compile.patch.prompt.md`; that prompt produces a
patched envelope for re-paste.

---

## 8. Authoritative source files

| concern        | file                                                           |
| -------------- | -------------------------------------------------------------- |
| TS types       | `app/src/types/visualSpec.ts`                                  |
| Validator      | `app/src/pipeline/visualValidator.ts`                          |
| Renderer       | `app/src/pipeline/visualRenderer.ts`                           |
| UI             | `app/src/CompilerPage.tsx`                                     |
| Chat prompts   | `.github/prompts/speckit.compile.*.prompt.md`                  |
| Chat agents    | `.github/agents/speckit.compile.*.agent.md`                    |

Any change to the contract must update **all** of: types, validator,
renderer, CompilerPage sample, this doc, and the `speckit.compile.*` agents
in lock-step.
