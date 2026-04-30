# Visual Envelope — Authoritative AI Compiler Spec

> **Canonical pipeline.** This document defines the JSON contract the in-app
> Compiler page accepts. The chat-side analysis is driven by the Spec Kit
> prompts under `.github/prompts/speckit.compile.*` (master, inventory,
> geometry, appearance, audit, patch, emit). Their final emitted artifact is
> the **Visual Envelope** described here. Paste that envelope into the
> Compiler page; the in-app validator + renderer then enforce this spec
> deterministically.

---

## Quick Paste Contract (JSON-Only)

Use this when generating envelopes to avoid parser errors and reduce overhead.

1. Output must be one raw JSON object only.
2. First non-whitespace char must be `{`.
3. Last non-whitespace char must be `}`.
4. No markdown fences, labels, notes, or prefixes/suffixes.
5. Top-level keys must be exactly: `inventory`, `decomposition`, `geometry`, `appearance`.
6. `inventory.canvas.width/height` must equal source image size.
7. Do not use implicit square fallback dimensions (such as `768x768`) unless source image is exactly that size.
8. If source width/height is uncertain, fail generation instead of guessing.
9. `inventory.elements.length === decomposition.length === geometry.length === appearance.length`.
10. ID sets must match exactly across all four stages.

Minimal envelope skeleton:

```json
{
  "inventory": {
    "canvas": { "width": 0, "height": 0, "shape": "rect" },
    "elements": []
  },
  "decomposition": [],
  "geometry": [],
  "appearance": []
}
```

If parser shows `Unexpected token ...`, response is not raw JSON.

---

## Upstream-Only Quality Strategy (Single Shot)

This pipeline keeps compiler behavior deterministic. Quality improvements happen
upstream in AI analysis output only.

1. No compile-side multi-candidate search.
2. No compile-side iterative correction loops.
3. Per-element decisions must use dual basis before emit:
  - Pixel basis: local region/edge/color evidence.
  - Structure basis: shape continuity, relative placement, layer coherence.
4. Group/layer preservation must be explicit in analysis output so renderer stays
  simple and stable.

---

## Full-Fidelity Policy (No Compaction)

This compiler workflow is detail-preserving by design.

1. Do not compact or simplify visible details to reduce envelope size.
2. Envelope size has no practical cap when required to preserve source fidelity.
3. Dense repeated motifs must be fully enumerated.
4. Radial text must preserve clearance from nearby marker bands (no overlap).
5. If boundary depth cues are visible, include seam/highlight/shadow layer support.
6. Texture labels alone are insufficient; textured materials require supporting overlays.

---

## Universal Renderability Policy

The pipeline is universal and domain-agnostic. For any input image:

1. Every emitted element must be renderable by current compiler primitives.
2. If a visible detail cannot be represented with existing vector primitives alone,
  emit an explicit raster patch using supported `shape: "image"` geometry.
3. Do not use semantic/domain naming to justify element decisions.
4. Keep the canonical `element` definition as pure visual decomposition only.

---

## End-to-End Fidelity Gate

Schema-valid output is necessary but not sufficient. Final acceptance requires:

1. Structural pass: envelope validates against contract.
2. Visual pass: rendered output compared against source image using deterministic metrics.
3. Recommended minimum thresholds:
  - Pixel similarity >= 0.94
  - Edge similarity >= 0.90
  - Color similarity >= 0.92
  - Weighted score >= 0.94

If visual gate fails, revise inventory/geometry/appearance and re-emit.

---

## Local Artifact Paths (Safe Folder)

When running tool-assisted local generation, write envelope artifacts only to:

1. `app/exports/compiler/temp_env.json` (full verbose envelope)
2. `app/exports/compiler/visual_envelope_full.json` (single copy source for paste)

Rules:

1. Do not write these artifacts in app root.
2. `visual_envelope_full.json` must be raw JSON only.
3. Validate with JSON parse before paste.

Canonical rewrite requirement (tool-assisted local runs):

1. On every successful emit, overwrite both files fully:
  - `app/exports/compiler/temp_env.json`
  - `app/exports/compiler/visual_envelope_full.json`
2. Never update only one of the two files.
3. Never append/merge old JSON fragments.
4. Post-write parity checks are mandatory:
  - same top-level keys (`inventory|decomposition|geometry|appearance`)
  - same stage counts
  - same effective payload

---

## 0. Pipeline overview

```
image  ──▶  speckit.compile.master.prompt.md  (chat)
                │
                ├─▶ speckit.compile.inventory.agent.md   → InventoryDoc
                ├─▶ speckit.compile.decomposition.agent.md → DecompositionEntry[]
                ├─▶ speckit.compile.geometry.agent.md    → GeometryEntry[]
                ├─▶ speckit.compile.appearance.agent.md  → AppearanceEntry[]
                ├─▶ speckit.compile.audit.agent.md       → ValidationReport
                └─▶ speckit.compile.emit.agent.md        → VisualEnvelope (JSON)
                                                              │
                                                              ▼
                                                    # Visual Envelope Canonical Contract

                                                    This file is the single source of truth for Visual Envelope JSON accepted by
                                                    the compiler flow. Speckit master prompt and all compile agents must reference
                                                    this file and must not redefine conflicting schema variants.

                                                    ---

                                                    ## 0. Canonical principles

                                                    1. Pure visual only: describe what is seen, not what it means.
                                                    2. One envelope shape only:
                                                       - `inventory`
                                                       - `decomposition`
                                                       - `geometry`
                                                       - `appearance`
                                                    3. IDs are immutable across stages: exact one-to-one parity.
                                                    4. Canvas units are source-image pixel units.
                                                    5. Canvas width and height must match attached source image resolution.
                                                    6. Never infer fallback square canvas dimensions (for example `768x768`) unless source is exactly that size.
                                                    7. If source dimensions are uncertain, fail generation and request a valid source image.
                                                    8. Transform fields are flat keys only (no nested `transform` object).
                                                    9. Polygon points are tuple arrays only: `[[x,y], ...]`.

                                                    ---

                                                    ## 1. Envelope shape

                                                    ```ts
                                                    interface VisualEnvelope {
                                                      inventory: InventoryDoc;
                                                      decomposition: DecompositionEntry[];
                                                      geometry: GeometryEntry[];
                                                      appearance: AppearanceEntry[];
                                                    }
                                                    ```

                                                    ID pattern:

                                                    `^[a-z][a-z0-9_]{0,63}$`

                                                    The same ID set must exist in all four stages.

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
                                                      bbox: { x: number; y: number; w: number; h: number };
                                                      zOrder: number;
                                                      groupId: string | null;
                                                    }
                                                    ```

                                                    Inventory rules:

                                                    1. `id` unique.
                                                    2. `zOrder` unique integer >= 0.
                                                    3. `groupId` is `null` or references an existing `kind: 'group'` id.
                                                    4. No nested groups in v1 (`group` entries must have `groupId: null`).
                                                    5. Every group has at least one child.

                                                    ---

                                                    ## 3. Geometry

                                                    Allowed entries:

                                                    ```ts
                                                    type GeometryEntry =
                                                      | { id: string; shape: 'circle';  cx: number; cy: number; r: number; rotation?: number; scaleX?: number; scaleY?: number; pivotX?: number; pivotY?: number }
                                                      | { id: string; shape: 'arc';     cx: number; cy: number; rOuter: number; rInner: number; startDeg: number; sweepDeg: number; rotation?: number; scaleX?: number; scaleY?: number; pivotX?: number; pivotY?: number }
                                                      | { id: string; shape: 'line';    x1: number; y1: number; x2: number; y2: number; rotation?: number; scaleX?: number; scaleY?: number; pivotX?: number; pivotY?: number }
                                                      | { id: string; shape: 'rect';    x: number; y: number; w: number; h: number; rx?: number; ry?: number; rotation?: number; scaleX?: number; scaleY?: number; pivotX?: number; pivotY?: number }
                                                      | { id: string; shape: 'polygon'; points: Array<[number, number]>; rotation?: number; scaleX?: number; scaleY?: number; pivotX?: number; pivotY?: number }
                                                      | { id: string; shape: 'path';    d: string; rotation?: number; scaleX?: number; scaleY?: number; pivotX?: number; pivotY?: number }
                                                      | { id: string; shape: 'text';    x: number; y: number; content: string; fontSize: number; anchor: 'start' | 'middle' | 'end'; rotation?: number; scaleX?: number; scaleY?: number; pivotX?: number; pivotY?: number }
                                                      | { id: string; shape: 'image';   x: number; y: number; w: number; h: number; rotation?: number; scaleX?: number; scaleY?: number; pivotX?: number; pivotY?: number }
                                                      | { id: string; shape: 'group' }
                                                      | { id: string; inherit: true };
                                                    ```

                                                    Geometry rules:

                                                    1. One entry per inventory id.
                                                    2. Numeric fields finite.
                                                    3. `rInner <= rOuter` for arcs.
                                                    4. Polygon has >= 3 points and each point is `[number, number]`.
                                                    5. Do not emit nested `transform` object variants.

                                                    ---

                                                    ## 4. Appearance

                                                    ```ts
                                                    type Fill =
                                                      | { kind: 'solid'; color: string; opacity?: number }
                                                      | { kind: 'linear'; angleDeg: number; stops: Array<{ offset: number; color: string; opacity?: number }> }
                                                      | { kind: 'radial'; cx: number; cy: number; r: number; stops: Array<{ offset: number; color: string; opacity?: number }> }
                                                      | { kind: 'none' };

                                                    type Stroke =
                                                      | 'none'
                                                      | {
                                                          color: string;
                                                          width: number;
                                                          opacity?: number;
                                                          dash?: number[];
                                                          cap?: 'butt' | 'round' | 'square';
                                                          join?: 'miter' | 'round' | 'bevel';
                                                        };

                                                    type AppearanceEntry =
                                                      | {
                                                          id: string;
                                                          fill: Fill;
                                                          stroke: Stroke;
                                                          opacity?: number;
                                                          texture?: 'matte' | 'brushed' | 'polished' | 'anodized' | 'lume' | 'printed' | null;
                                                          blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | null;
                                                          clipPath?: string | null;
                                                          filter?: 'shadow' | 'glow' | 'blur' | null;
                                                        }
                                                      | { id: string; inherit: true };
                                                    ```

                                                    Appearance rules:

                                                    1. One entry per inventory id.
                                                    2. Colors are lowercase `#rrggbb` or `#rrggbbaa`.
                                                    3. Gradient stops count >= 2 and each `offset` in `[0,1]`.
                                                    4. `clipPath`, if present, references an existing inventory id.
                                                    5. Texture tags must match visible overlays from geometry/inventory when texture is obvious.

                                                    ---

                                                    ## 5. Validation gates (compiler and audit)

                                                    1. G1: top-level envelope shape.
                                                    2. G2: inventory integrity.
                                                    3. G3: geometry coverage and field shape.
                                                    4. G4: appearance coverage and field shape.
                                                    5. G5: cross-stage id parity.
                                                    6. G6: vocabulary anti-leak.

                                                    Forbidden tokens include:

                                                    `bezel, dial, crown, pusher, subdial, complication, hour_hand, minute_hand, second_hand, pointer, tick, marker, numeral, screw, lume_pip, time_pointer, arc_progress, battery, steps, heart_rate, time_hour, time_minute, time_second`

                                                    ---

                                                    ## 6. Pre-paste checklist

                                                    1. Top-level keys are exactly `inventory`, `decomposition`, `geometry`, `appearance`.
                                                    2. `inventory.canvas.width/height` equals source image width/height.
                                                    3. No implicit fallback square canvas (for example `768x768`) unless source is exactly that size.
                                                    4. All four stages contain the same id set.
                                                    5. IDs satisfy regex and are purpose-neutral.
                                                    6. No duplicate `zOrder`.
                                                    7. All polygon points use tuple format.
                                                    8. Only flat transform keys are used.
                                                    9. Colors are lowercase hex.
                                                    10. No forbidden semantic vocabulary appears.
                                                    11. JSON starts with `{` and ends with `}` with no extra text.

                                                    ---

                                                    ## 7. Lock-step files

                                                    Update these together for any contract change:

                                                    1. `app/src/types/visualSpec.ts`
                                                    2. `app/src/pipeline/visualValidator.ts`
                                                    3. `app/src/pipeline/visualRenderer.ts`
                                                    4. `app/src/CompilerPage.tsx`
                                                    5. `.github/prompts/speckit.compile.master.prompt.md`
                                                    6. `.github/agents/speckit.compile.*.agent.md`
                                                    7. `app/docs/AI_ANALYSIS_COMPILER_GUIDE.md`
