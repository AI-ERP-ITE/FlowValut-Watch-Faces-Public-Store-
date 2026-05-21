# Spec 092 — Gauge Pointer Composite Parser (Needle + Arc + Background)

**Feature Branch**: `092-gauge-pointer-composite-parser`
**Created**: 2026-05-21
**Status**: In Progress
**Supersedes**: Spec 091 Phase 2 (arc frame generator, previously deferred)

---

## Problem Statement

The current Spec 091 parser treats the gauge SVG as a two-layer split: needle vs everything-else. This breaks for:

1. **Start/End rotation bug**: `angleDeg = (start+end)/2` recalculates every time one bound changes → the needle (or whole gauge) visually spins during arc range calibration. The arc sweep limits and the needle preview position must be fully decoupled.

2. **Needle preview at wrong angle**: After strip-rotate, the needle PNG points in its natural SVG direction (often horizontal). The canvas preview draws it at 0° canvas = right. This never matches the gauge's "zero value" position. The original `rotate(N)` from the SVG must be stored and used as the initial preview angle.

3. **Arc fill is treated as static background**: Gauges with a progress arc (fills from 0% to 100% as value increases) bake the arc into the background PNG. On the watch the arc fill IS animated — it's an `IMG_LEVEL` widget. The parser must detect the arc fill group and generate per-tick PNG frames for it, separate from the static background.

---

## Architecture

### One unified pipeline — purely additive, HTML is source of truth

The parser runs ALL three detectors simultaneously. Whatever is found is rendered and output. Nothing is deleted from the canvas. The HTML decides the composition.

```
SVG DOM
  ├─ Detector A → needle group?      → if found: render needle PNG, store naturalAngle
  ├─ Detector B → arc fill group?    → if found: render N arc-frame PNGs
  └─ Detector C → arc range / ticks  → always: extract startAngle, endAngle, tick list
```

Element creation (PropertyPanel buildGaugeFromMarkup):
```
needleDataUrl truthy?      → update GAUGE_POINTER (src, previewAngle=naturalAngle, pivot, range)
arcFrames truthy?          → create IMG_LEVEL sibling with N frames
backgroundDataUrl truthy?  → create IMG sibling (static remainder)
```

No classification enum. No branching on "type". Each output slot is independently populated.

---

## Detector Specifications

### Detector A — Needle (enhanced from 091)

Already implemented (any-depth `querySelectorAll` scan). No changes needed.

Additional output: **`naturalAngle`** — the `rotate(N)` value stripped from the needle group.
Stored on GAUGE_POINTER element as `previewAngle`.

### Detector B — Arc Fill Group

Heuristic (in order of confidence):

| Priority | Condition |
|---|---|
| 1 (highest) | `<g>` or `<path>` has ID/class containing any of: `arc`, `active`, `fill`, `progress`, `indicator`, `pointer-arc`, `gauge-fill` |
| 2 | `<g>` contains a `<path>` whose `d` attribute contains SVG arc command `A` or `a` |
| 3 | `<path>` at top level of translate group with `A`/`a` command and stroke but no fill |

Exclusion: element must NOT have a `rotate(N)` transform on itself (that's the needle, not the arc).

If multiple candidates, prefer the one matching priority 1 first.

### Detector C — Arc Range + Tick List (enhanced from 091)

Existing: collects `rotate(N)` from `<line>` elements → `{ startAngle, endAngle }`.

Enhancement: also return the **full sorted tick angle array** for use as frame endpoints.

Frame count = `min(tickAngles.length, MAX_ARC_FRAMES)` where `MAX_ARC_FRAMES = 20`.
Fallback (0 ticks): 10 evenly-spaced frames across `[startAngle, endAngle]`.

---

## Arc Frame Generation

For each tick angle (i.e. each frame endpoint):

1. Clone the SVG DOM (full clone including defs)
2. Remove needle group (if present) from clone
3. Remove background elements from clone — keep only arc fill group + defs
4. Rewrite the arc fill `<path>` `d` attribute with endpoint at the current tick angle
5. Render clone to PNG via `renderSvgToDataUrl`

### Arc path rewrite formula

Given: `cx`, `cy` (from translate pivot), `r` (from first `A` command in path), `startAngleSvg`, `endAngleSvg` (tick angle for this frame).

All SVG angles are in SVG coordinate convention: 0° = right, clockwise positive.
The `rotate(N)` angles in the SVG are also in this convention.

```
endX = cx + r * cos(endAngleSvg in radians)
endY = cy + r * sin(endAngleSvg in radians)
largeArcFlag = abs(endAngleSvg - startAngleSvg) > 180 ? 1 : 0
sweepFlag = 1  (clockwise)

new d = `M startX startY A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`
```

`startX`, `startY`, `r` are parsed from the original `d` attribute's first `M` and `A` commands.

### Radius extraction

Parse the first `A` command in the arc path `d`:
```
d = "M x1 y1 A rx ry x-rot large-arc sweep x2 y2 ..."
→ r = parseFloat(rx)   (rx === ry for circular arcs)
→ startX = x1, startY = y1
```

---

## Canvas Preview Fix

### Issue: needle spins when adjusting arc range bounds

**Root cause**: `drawGaugePointer` uses `angleDeg = (startAngle + endAngle) / 2` — midpoint shifts every time one bound changes.

**Fix**: Replace midpoint formula with `el.previewAngle ?? 0`.

`previewAngle` is set once at build time to `naturalAngle` (the original `rotate(N)` from the SVG). Adjusting `startAngle`/`endAngle` bounds never writes `previewAngle`.

---

## New Type Fields (types/index.ts)

```typescript
// GAUGE_POINTER
previewAngle?: number;   // Canvas draw angle (degrees). Set at build time from naturalAngle.
                         // Changing startAngle/endAngle does NOT update this.
```

No `naturalAngle` stored separately — `previewAngle` IS the natural angle after first build.
No `gaugeType` enum — not needed, composition is implicit.

---

## Updated GaugeParseResult (gaugePointerParser.ts)

```typescript
export interface GaugeParseResult {
  // ── existing fields (unchanged) ──────────────────────────────────────────
  needleFound: boolean;
  needleDataUrl: string;
  backgroundDataUrl: string;
  pivotX: number;
  pivotY: number;
  startAngle: number | null;
  endAngle: number | null;
  statusMessage: string;
  // ── new fields ────────────────────────────────────────────────────────────
  /** The original rotate(N) angle stripped from the needle — used as previewAngle. */
  naturalAngle: number;
  /** Arc fill frames (IMG_LEVEL). Empty array if no arc fill group detected. */
  arcFrames: string[];
  /** Number of ticks detected (informational for status message). */
  tickCount: number;
}
```

---

## Files Changed

| File | Change |
|---|---|
| `app/src/lib/gaugePointerParser.ts` | Add Detector B, arc frame rendering, `naturalAngle`, `arcFrames`, `tickCount` to result |
| `app/src/types/index.ts` | Add `previewAngle?: number` to WatchFaceElement |
| `app/src/components/PropertyPanel.tsx` | Pass `previewAngle = result.naturalAngle` when updating GAUGE_POINTER; create IMG_LEVEL sibling if `arcFrames.length > 0` |
| `app/src/components/InteractiveCanvas.tsx` | `drawGaugePointer`: replace `(start+end)/2` with `el.previewAngle ?? 0` |

---

## Tasks

### Task 1 — types/index.ts: add `previewAngle`
Add `previewAngle?: number` field to `WatchFaceElement`.

### Task 2 — gaugePointerParser.ts: return `naturalAngle`
Extract the `rotate(N)` value from the detected needle group before stripping it.
Return as `naturalAngle: number` (default 0 if not found or no needle).
Update `GaugeParseResult` interface.

### Task 3 — gaugePointerParser.ts: return full tick list
Enhance `detectArcRange` to also return the sorted tick angle array.
Return `tickCount: number` in result.

### Task 4 — gaugePointerParser.ts: Detector B — arc fill group
Implement arc fill detector with priority heuristics described above.
Return the detected arc fill `Element | null`.

### Task 5 — gaugePointerParser.ts: arc frame rendering
Implement arc path rewrite + per-frame SVG rendering.
Populate `arcFrames: string[]` in result.
Clones keep defs; remove needle + background siblings; only arc group stays.

### Task 6 — gaugePointerParser.ts: background clone excludes arc group
Update background clone step: remove BOTH needle group AND arc fill group from background clone so background PNG is truly static (bezel, ticks, labels only).

### Task 7 — InteractiveCanvas.tsx: fix preview angle
In `drawGaugePointer`, replace `(startAngle + endAngle) / 2` with `el.previewAngle ?? 0`.

### Task 8 — PropertyPanel.tsx: wire previewAngle + arcFrames
In `buildGaugeFromMarkup`:
- Add `previewAngle: result.naturalAngle` to GAUGE_POINTER update payload
- After existing needle+background handling, if `result.arcFrames.length > 0`, call `onAddSiblingElement` with `type: 'IMG_LEVEL'`, `images: result.arcFrames`, `imageSwitcherFrameCount: result.arcFrames.length`, positioned at same bounds, zIndex between background and needle

### Task 9 — Review, build, deploy

---

## Review Checklist

- [ ] Build passes (`npm run build:private`)
- [ ] `drawGaugePointer` no longer rotates when only start/end bounds change
- [ ] Build from Fleming MK-2 HTML → status shows "Needle auto-detected. Arc: N ticks."
- [ ] Canvas preview shows needle at its original HTML angle (not midpoint)
- [ ] If arc fill detected → IMG_LEVEL sibling created with correct frame count
- [ ] Background PNG contains no needle and no arc fill
- [ ] Fallback (no needle, no arc) → full image used, graceful status message
