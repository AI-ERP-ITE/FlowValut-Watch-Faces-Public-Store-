# Spec 113 — Deployment Report

## Deploy Date
2026-07-06

## Target
Private site only — `origin/main` (ai-erp-ite.github.io/Watch-Faces/)

## Command Used
`npm run deploy:full:private` ✅

## Commit Hashes
| Remote | Commit | Bundle |
|---|---|---|
| `origin/main` | `56211f7b` | `index-Bn_LOrj6.js` |
| `public/main` | `121abc58` | unchanged — not touched |

## Files Changed
- `src/lib/digitGlyphMetrics.ts` — NEW: core glyph metric extraction and pair correction engine
- `src/types/glyphMetricsTypes.ts` — NEW: re-export for circular-free type access
- `src/lib/digitLayoutEngine.ts` — REWRITTEN: visible-ink layout, pair correction lookup
- `src/types/index.ts` — EXTENDED: `ElementImage.glyphMetrics`, `ElementImage.pairCorrectionTable`
- `src/StudioApp.tsx` — UPDATED: makeDigitCanvas extracts metrics + builds table
- `src/pipeline/assetImageGenerator.ts` — UPDATED: generateDigitImages extracts metrics + builds table
- `src/components/InteractiveCanvas.tsx` — UPDATED: passes table to layout engine
- `specs/113-optical-pair-centering-visible-glyph-metrics/` — NEW: spec, plan, tasks, validation

## Verification
- Build: ✅ `npm run build` passed, 0 TS errors
- Private deploy: ✅ pushed to `origin/main`
- Public remote: ✅ untouched at `121abc58`
