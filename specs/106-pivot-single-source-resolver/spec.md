# Spec 106 — Single-Source Tip/Tail Pivot Resolver (Stage 3 Consolidation)

## Problem
Custom analog hands (e.g. FL_OR_6, FL_OR_9, FL_OR_10) rotate around their **geometric
center** instead of near their **base**, like a real watch hand. Ground-truth diagnostic of a
freshly-saved hand showed `hourPivotNorm = 0.5`, `minutePivotNorm = 0.5`, `secondPivotNorm = 0.5`
(→ `hourPosY = 70 = 0.5 × 140`). The pivot was saved at dead center.

The pivot value `composerAxis` should have been `DEFAULT_AXIS = { hour: 0.843, minute: 0.860,
second: 0.750 }` (near the base) but landed on `0.5` (center).

## Root Cause
"Where the hand rotates" is resolved in several disconnected places, two of which leak `0.5`:

1. **Auto-validate gap** — the auto-validation effect (`runLayerCheck`, runs ~250ms after a
   paste) sets the preview PNG and the layer anchor but **never initializes `composerAxis`**.
   Only the manual **Validate All** button (`validateLayer`) initializes the pivot. A hand pasted
   and saved without clicking Validate All keeps whatever `composerAxis` already was.

2. **Reset snaps to center** — `resetAxisAdjustment` sets `composerAxis[hand] =
   composerLayerAnchor[hand].yRatio`, which is `0.5` for any markerless hand (the SVG parser
   returns `yRatio = 0.5` when no pivot marker is found). A clock hand pivot is never at its
   exact vertical center, so this is always wrong.

`0.5` is the markerless **sentinel**, not a real pivot. Once it lands in `composerAxis` (via
either gap), the save faithfully bakes a center pivot. The render is correct; it is simply told
the wrong pivot.

## Architecture Audit — only Stage 3 is broken
The pointer pipeline has two orthogonal canonical values: **proportion** (size ratios to the hub)
and **pivot** (tip/tail). Reading the live code shows every stage except pivot resolution is
already canonical:

| Stage | Owner | Status |
| --- | --- | --- |
| 1 Parse marker | `parseLayerAnchorFromSvg` | OK — returns `0.5` only as "no marker" sentinel |
| 2 Measure proportion | `ratioGeometry` (Spec 104) | OK — kept verbatim |
| 3 **Resolve pivot** | scattered: init / `validateLayer` / `runLayerCheck` / `resetAxisAdjustment` | **BROKEN — leaks 0.5** |
| 4 Bake | `renderHandToPngWithPivot` | OK |
| 5 Persist | `saveCustomHandStyle` (`hourPosY`/`hourPivotNorm`/`ratioGeometry` all derived from one `composerAxis`) | OK |
| 6 Render / export | `drawTimePointer` reads `customRecord.hourPosY ?? def.pivotY` | OK — single read + built-in fallback |

So the fix is a **Stage 3 consolidation**, not a pipeline rewrite. The stored `hourPosY`,
`hourPivotNorm`, and `ratioGeometry.*PivotYRatio` are derived projections of one resolved pivot
value — they become consistent automatically once the resolver is correct.

## Solution — one resolver, all init points routed through it
A single pure function is the only place that decides the markerless default. A real clock marker
is never at exact vertical center, and `0.5` is precisely the parser's "no marker" sentinel, so:

```ts
function resolveInitialAxis(
  handKey: 'hour' | 'minute' | 'second',
  anchorYRatio: number,
): number {
  const hasUsableMarker = anchorYRatio !== 0.5;
  return hasUsableMarker ? anchorYRatio : DEFAULT_AXIS[handKey];
}
```

Routed through this resolver:
- **`validateLayer`** (manual) — replaces the inline `hasPivotMarker` branch.
- **`runLayerCheck`** (auto-validate) — **adds** the missing `composerAxis` init, with the same
  per-HTML guard, so a hand pasted and saved without clicking Validate All still gets the correct
  base pivot. *(This closes the primary gap.)*
- **`resetAxisAdjustment`** — resets to the resolved pivot (marker or base), never raw `0.5`.

`composerAxis` is initialized once per HTML (guarded by `composerAxisInitialized`); a user's
manual slider adjustment for the same HTML is preserved. The save path already consumes
`composerAxis` — no change needed there.

## What is intentionally NOT changed (safety)
- **Render path** (`drawTimePointer`: `customRecord.hourPosY ?? def.pivotY`) — untouched.
  Built-in/standard pointers keep `def.pivotY` and cannot regress.
- **Record schema** — unchanged. `hourPosY` / `hourPivotNorm` / `ratioGeometry` remain; they are
  all derived from the one resolved pivot, so they stay mutually consistent.
- **Spec 104 proportion system** (`ratioGeometry`, `measureHandArtSize`, `measureHubArtSize`) —
  kept verbatim.
- **No data migration.** Per the chosen option, existing records are not rewritten.

## Backward Compatibility
- **Standard / built-in (AI-shipped) pointers** — not stored as custom records; render from
  `HAND_DEFS` + `def.pivotY`. **Zero effect.**
- **Existing custom hands saved correctly** (real pivot) — `pivotNorm` preserved, read identically.
  **Zero visual change.**
- **Existing custom hands currently centered** (the bug) — left as-is; **re-save once** to fix
  (re-save runs the corrected resolver → base pivot). Never made worse.

## Interaction with prior specs
- **Supersedes Spec 105** — Spec 105 set `composerAxis = anchor.yRatio` whenever an SVG layer
  existed, and `anchor.yRatio = 0.5` for markerless hands; that is the original `0.5` leak.
- **Preserves Spec 104** — the hub-ratio proportion system is untouched.

## Files Changed
- `app/src/components/IconLab.tsx`
  - add module-scope `resolveInitialAxis` helper
  - `validateLayer` → use resolver
  - `runLayerCheck` (auto-validate effect) → initialize `composerAxis` via resolver
  - `resetAxisAdjustment` → use resolver

## Acceptance
- Paste a markerless hand set, **Save without clicking Validate All** → stored `hourPivotNorm ≈
  0.843`, `hourPosY ≈ 118` (base pivot), hand rotates near its base on the studio canvas.
- Paste a hand with a real pivot marker → stored pivot equals the marker ratio.
- Drag the tip/tail slider, re-validate the same HTML → adjustment preserved.
- Click **Reset** on a markerless hand → returns to base default (≈0.843), not center (0.5).
- Built-in pointers and previously-correct custom hands render unchanged.
