# Plan — Spec 093 Gauge Data-Model Rewrite

## Strategy

Option 3: Full data-model rewrite. Three clean phases, pure data contracts, zero DOM markers.

Implementation order is bottom-up (data → detect → render → apply) so each layer
is testable before the next is built on top.

---

## Phase Map

```
Step 1: gaugeModel.ts         ← define interfaces (no logic)
Step 2: gaugeDetector.ts      ← Phase 1: parse SVG → ParsedGauge
Step 3: gaugeRenderer.ts      ← Phase 2: ParsedGauge → GaugeRenderResult
Step 4: PropertyPanel.tsx     ← Phase 3: swap parseAndRenderGaugeSvg with new pipeline
Step 5: gaugePointerParser.ts ← delete
Step 6: build + deploy
```

---

## Step 1 — `gaugeModel.ts`

New file. Pure type definitions. No logic.

Exports:
- `SvgTemplate`
- `GaugeGeometry`
- `ParsedGauge`
- `GaugeRenderResult`

---

## Step 2 — `gaugeDetector.ts`

New file. Implements `detectGauge(svgString): ParsedGauge | null`.

Sequence:
1. `DOMParser.parseFromString` → get `svgEl`
2. `getViewBoxSize(svgEl)` → width, height
3. `findMainTranslateGroup(svgEl)` → mainGroup, cx, cy
4. `detectNeedleGroup(mainGroup.el)` → needleEl (or null)
5. `detectArcFillGroup(searchRoot, needleEl)` → arcFillEl (or null)
6. `detectArcRange(svgEl, needleEl)` → arcRange (or null)
7. Extract `<defs>` block as serialized string
8. **IMMEDIATELY deep-clone** needleEl, arcFillEl, all other mainGroup children
9. Compute geometry (pivotX/Y, naturalAngle, arcRadius)
10. **Discard `doc`** (let GC collect it)
11. Return `ParsedGauge` with cloned nodes + geometry

Ports detection logic verbatim from `gaugePointerParser.ts`:
- `detectNeedleGroup` — scoring algorithm unchanged
- `detectArcFillGroup` — keyword + arc-command detection unchanged
- `detectArcRange` — tick rotation scan unchanged
- `extractRotateAngle` / `extractTranslate` / `getViewBoxSize` / `findMainTranslateGroup` — copied

No markers. No DOM writes except cloning.

---

## Step 3 — `gaugeRenderer.ts`

New file. Implements `renderGaugeAssets(parsed, renderSize): Promise<GaugeRenderResult>`.

Helper: `buildSvgFromNodes(template, nodes, transformOverrides?)`:
- Creates a fresh `<svg>` element with template's viewBox/width/height
- Adds defs block if present
- Creates `<g transform="mainTransform">` containing the provided nodes (each cloned again for safety)
- Serializes to string

Sub-functions:

**`renderNeedlePng`**:
```
clone = needleNode.cloneNode(true)
strip rotate() from clone's transform attribute
svgStr = buildSvgFromNodes(template, [clone])
return renderSvgToDataUrl(svgStr, renderSize)
```

**`renderBackgroundPng`**:
```
clones = backgroundNodes.map(n => n.cloneNode(true))
svgStr = buildSvgFromNodes(template, clones)
return renderSvgToDataUrl(svgStr, renderSize)
```

**`renderArcFrames`** (11 frames):
```
for ratio in [0, 0.1, 0.2, ..., 1.0]:
  arcClone = arcNode.cloneNode(true)
  find arc paths in arcClone
  set stroke-dasharray = (ratio * arcLength) + " 9999"
  svgStr = buildSvgFromNodes(template, [arcClone])
  frames.push(renderSvgToDataUrl(svgStr, renderSize))
```

**Key invariant:** `parsed.needleNode`, `parsed.arcNode`, `parsed.backgroundNodes` are NEVER mutated.
All mutations happen on local clones inside each sub-function, discarded after use.

---

## Step 4 — `PropertyPanel.tsx`

Replace single import and single call site in `buildGaugeFromMarkup`:

```ts
// OLD
import { parseAndRenderGaugeSvg } from '@/lib/gaugePointerParser';
// ...
const result = await parseAndRenderGaugeSvg(frame, 400);

// NEW
import { detectGauge } from '@/lib/gaugeDetector';
import { renderGaugeAssets } from '@/lib/gaugeRenderer';
// ...
const parsed = detectGauge(frame);
if (!parsed) { setCreatorStatus('Gauge SVG parse failed.'); return; }
const result = await renderGaugeAssets(parsed, 400);
```

`GaugeRenderResult` fields map to `GaugeParseResult` fields:
| Old field | New field |
|---|---|
| `result.needleFound` | `result.geometry.detected.needle` wait — actually use `parsed.detected.needle` |
| `result.needleDataUrl` | `result.needlePng` |
| `result.backgroundDataUrl` | `result.backgroundPng` |
| `result.pivotX` | `result.geometry.pivotX` |
| `result.pivotY` | `result.geometry.pivotY` |
| `result.startAngle` | `result.geometry.arcStart` |
| `result.endAngle` | `result.geometry.arcEnd` |
| `result.naturalAngle` | `result.geometry.naturalAngle` |
| `result.naturalWidth` | `result.geometry.naturalWidth` |
| `result.naturalHeight` | `result.geometry.naturalHeight` |
| `result.arcFrames` | `result.arcFrames` |
| `result.statusMessage` | `result.statusMessage` |

The `detected` flags live on `ParsedGauge` (available before rendering), so Phase 3 can check `parsed.detected.needle` to decide whether to create the background sibling.

---

## Step 5 — Delete `gaugePointerParser.ts`

After Step 4, verify zero imports of `gaugePointerParser` remain, then delete the file.

---

## Step 6 — Build + Deploy

```powershell
cd app
npm run build:private   # verify zero TypeScript errors
npm run deploy:full:private
```

Report: commit hash, bundle hash.
