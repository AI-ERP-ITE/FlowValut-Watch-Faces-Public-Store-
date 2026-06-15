# Verification — Spec 093 Gauge Data-Model Rewrite

## Build Verification

- [ ] `npm run build:private` exits with code 0
- [ ] Zero TypeScript type errors in output
- [ ] Bundle contains no reference to `gaugePointerParser`
- [ ] Bundle contains no reference to `NEEDLE_MARKER` or `ARC_FILL_MARKER`

## Code Invariants

- [ ] `gaugePointerParser.ts` does not exist in `app/src/lib/`
- [ ] `gaugeModel.ts` exports `ParsedGauge`, `GaugeRenderResult`, `SvgTemplate`, `GaugeGeometry`
- [ ] `gaugeDetector.ts` exports `detectGauge` — no DOM marker attributes set anywhere
- [ ] `gaugeRenderer.ts` exports `renderGaugeAssets` — no mutations to `parsed.needleNode` / `parsed.arcNode` / `parsed.backgroundNodes`
- [ ] `PropertyPanel.tsx` does not import from `gaugePointerParser`

## Pipeline Correctness (manual browser test)

1. Open Studio → add GAUGE_POINTER element
2. Paste Fleming MK-2 Mechanical Gauge HTML into markup field
3. Click "Build from markup"
4. Status bar shows: `Needle auto-detected. Arc: Xdeg→Ydeg (N ticks). Arc fill detected → 11 IMG_LEVEL frames. Background IMG created below.`
5. Canvas shows: needle PNG (thin needle only, no bezel) + background IMG (gauge body, no needle) + arc fill IMG_LEVEL
6. Export ZPK
7. Inspect ZPK contents:
   - `assets/gauge_needle_<id>.png` — thin needle only, transparent background
   - `assets/gauge_bg_<id>.png` — gauge body only, no needle
   - `assets/gauge_arc_<id>_frame0.png` through `frame10.png` — 11 frames
8. `index.js` references `gauge_needle_<id>.png` as `src` for `IMG_POINTER`

## Watch Device Test (after ZPK install)

- [ ] Needle rotates to correct angle for current battery/data value
- [ ] Gauge background stays static (does not rotate)
- [ ] At 0% value: needle at start angle
- [ ] At 100% value: needle at end angle
- [ ] Arc fill updates correctly per data value

## Regression

- [ ] Non-SVG gauge markup (legacy HTML path) still renders a pointer PNG
- [ ] Other element types in PropertyPanel unaffected (IMG, TEXT, TIME_POINTER, etc.)
- [ ] ZPK export for non-gauge elements unaffected
