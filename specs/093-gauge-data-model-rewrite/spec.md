# Spec 093 — Gauge Pipeline Full Data-Model Rewrite

## Problem

Specs 091 and 092 introduced a DOM-mutation pipeline for splitting gauge SVGs into needle / background / arc-frame PNGs. The pipeline communicates between phases by stamping attribute markers onto live DOM nodes (`data-gauge-needle-091`, `data-gauge-arc-092`). Any function that touches the DOM can silently strip those markers, causing downstream phases to find nothing and fall back to rendering the whole gauge as one fused image.

**Root bug confirmed in Spec 092:** `generateArcFrames` cleans up BOTH markers at the end. The caller only re-stamps `ARC_FILL_MARKER`. `NEEDLE_MARKER` stays gone. The needle-only clone finds no marked node → renders the full gauge. Every deploy since Spec 091 has shipped a broken needle PNG.

**Symptom chain:**
1. `gauge_pointer.png` = whole gauge (bezel + ticks + needle fused)
2. `IMG_POINTER` rotates the WHOLE image by data value
3. Needle appears frozen (it is baked into the background)
4. Entire gauge rotates instead of just the needle
5. Value never reads correctly

## Goal

Rewrite the gauge parsing pipeline into three clean phases with explicit data contracts. Eliminate DOM attribute markers entirely.

```
PHASE 1 — DETECT   (pure read; produces immutable data artifacts)
PHASE 2 — RENDER   (pure functions; input → output; no side effects)
PHASE 3 — APPLY    (React only; calls Phase 1+2; updates state)
```

## Architecture

### Phase 1 — Detect

File: `app/src/lib/gaugeDetector.ts`

```
detectGauge(svgString: string): ParsedGauge | null
```

- Parses SVG DOM once (read-only scan)
- Detects needle group, arc fill group, arc range, pivot, viewBox
- Deep-clones each detected node IMMEDIATELY after detection
- Discards the original parsed DOM
- Returns `ParsedGauge` — a plain data object, no live DOM references

**No markers. No mutations to original tree. Cloning is the only DOM write.**

### Phase 2 — Render

File: `app/src/lib/gaugeRenderer.ts`

```
renderGaugeAssets(parsed: ParsedGauge, renderSize: number): Promise<GaugeRenderResult>
```

Three sub-functions, each takes inputs → returns a PNG data URL:

```
renderNeedlePng(parsed, renderSize)      → dataURL
renderBackgroundPng(parsed, renderSize)  → dataURL
renderArcFrames(parsed, renderSize)      → dataURL[]
```

Each sub-function:
1. Builds a fresh minimal SVG from the stored template + cloned node(s)
2. Applies any needed transform manipulation to a LOCAL clone (never to stored nodes)
3. Serializes to string → renders → returns data URL
4. Discards the local clone

**No markers. Stored nodes in `ParsedGauge` are never mutated. Each call is independent.**

### Phase 3 — Apply

Location: `buildGaugeFromMarkup` in `app/src/components/PropertyPanel.tsx`

```
const parsed = detectGauge(svgString);
if (!parsed) { ... handle failure ... }
const result = await renderGaugeAssets(parsed, 400);
// React state updates (unchanged from current code)
```

**No parsing logic. No rendering logic. Only React dispatch.**

---

## Data Contracts

### `ParsedGauge` (Phase 1 output / Phase 2 input)

```ts
interface SvgTemplate {
  viewBox: string;        // raw viewBox attribute string
  width: number;          // parsed viewBox width
  height: number;         // parsed viewBox height
  defsHtml: string;       // serialized <defs> block (empty string if none)
  mainTransform: string;  // transform on the main translate group e.g. "translate(200,200)"
}

interface GaugeGeometry {
  naturalWidth: number;   // SVG viewBox width
  naturalHeight: number;  // SVG viewBox height
  naturalAngle: number;   // midpoint of arc range (preview angle at 0° → mid-range)
  arcStart: number;       // start angle from tick detection (degrees)
  arcEnd: number;         // end angle from tick detection (degrees)
  tickAngles: number[];   // all unique tick rotation angles
  pivotX: number;         // normalised pivot X (0–1) from translate center
  pivotY: number;         // normalised pivot Y (0–1)
  arcRadius: number;      // arc path stroke radius (0 if not detected)
}

interface ParsedGauge {
  needleNode: Node;             // deep clone of needle <g>
  arcNode: Node | null;         // deep clone of arc fill <g> or <path> (null if not found)
  backgroundNodes: Node[];      // deep clones of all other children in main group
  template: SvgTemplate;
  geometry: GaugeGeometry;
  detected: {
    needle: boolean;
    arc: boolean;
    arcRange: boolean;
  };
}
```

### `GaugeRenderResult` (Phase 2 output / Phase 3 input)

```ts
interface GaugeRenderResult {
  needlePng: string;         // dataURL — needle only at 0° (rotate stripped)
  backgroundPng: string;     // dataURL — gauge minus needle and arc fill
  arcFrames: string[];       // 11 dataURLs — 0%..100% fill frames
  geometry: GaugeGeometry;   // pass-through from ParsedGauge
  statusMessage: string;
}
```

---

## Files Affected

| Action | File |
|---|---|
| CREATE | `app/src/lib/gaugeModel.ts` |
| CREATE | `app/src/lib/gaugeDetector.ts` |
| CREATE | `app/src/lib/gaugeRenderer.ts` |
| MODIFY | `app/src/components/PropertyPanel.tsx` |
| DELETE | `app/src/lib/gaugePointerParser.ts` (after usages removed) |

---

## Constraints

- Do NOT change `PropertyPanel.tsx` React logic beyond replacing the `parseAndRenderGaugeSvg` call.
- Do NOT change the ZPK export pipeline.
- Do NOT change element model types (`WatchFaceElement`).
- `GaugeRenderResult` must expose the same fields as current `GaugeParseResult` so `PropertyPanel.tsx` Phase 3 code needs minimal changes.
- Arc frame count stays at 11 (0%–100%).
- Pivot detection logic stays identical to Spec 092.
- Needle detection scoring logic stays identical to Spec 092.

---

## Non-Goals

- This spec does NOT change the watch-side ZPK output format.
- This spec does NOT add new gauge features.
- This spec does NOT change the PropertyPanel UI.
