# Spec 090 — Bug Fix Round 5 (ISSUE_LOG #19–#25)

**Status:** APPROVED — phased execution, per-fix user approval required
**Predecessor:** Spec 089 (image switcher source HTML)
**Linked Issues:** ISSUE_LOG #19, #20, #21, #22, #23, #24, #25

---

## Problem Set

Seven independent regressions / gaps reported by user after deploy `81086ba2` (bundle `index-BClYIJfG.js`):

| # | Title | Severity |
|---|-------|----------|
| 19 | Weather Status sets dropdown empty (no standard + custom picker) | medium |
| 20 | Weather Status icons not rendering in interactive preview | medium |
| 21 | IMG_WEEK Full / Short / Initial all render same placeholder ("WED") | low |
| 22 | Missing Month Digit widget option (UI gap; backend already supports it) | medium |
| 23 | Date / element positions drift between preview canvas and on-watch | high |
| 24 | TIME_POINTER on AOD loses hub overlay + position shifts | medium |
| 25 | Gauge Pointer with custom needle renders on canvas but missing on watch | high |

Full root-cause analysis lives in chat transcript dated 2026-05-15. Summary captured in tasks.md.

## Goals

- Fix each bug at its actual root cause (file:line identified per task).
- Preserve full pipeline consistency: each touched area is checked **two steps upstream + two steps downstream** for ripple effects before edit.
- Surface any required dependency change to the user **before** modifying it (per user rule).
- Zero regressions in working code paths (especially the gauge default-needle case which already works).

## Non-Goals

- No refactor / rewrite. Surgical edits only.
- No new widget types unless strictly required (#22 may re-use existing IMG_DATE with `subtype: 'month'`).
- No CANVAS_SIZE → dynamic-resolution refactor in this spec (Bug #23 Part B is deferred — see Risks).

## Scope

### Files in scope (read or edit)

- `app/src/components/InteractiveCanvas.tsx` — placeholder text (#21), draw paths (#20, #24)
- `app/src/components/PropertyPanel.tsx` — weather set picker (#19), month/week toggles (#22)
- `app/src/StudioApp.tsx` — widget picker (#22), AOD time-pointer hub inheritance (#24), gauge-pointer asset injection (#25)
- `app/src/lib/jsCodeGeneratorV2.ts` — falsy-zero `||` fallbacks (#23 Part A), TIME_POINTER center fallback (#24)
- `app/src/lib/weatherIconSets.ts` — read only (verify standard set list)
- `app/src/lib/gaugePointerDefaults.ts` — read only
- `ISSUE_LOG.md` (root) — add entries #19–#25 with resolution status

### Pipeline consistency check (per-fix)

For every edit, verify **two steps before** (input source, normalization) and **two steps after** (downstream serializer, exporter) match the new behavior. Document the check in the per-fix completion note.

## Acceptance

- Each bug verified fixed in private deploy (`https://ai-erp-ite.github.io/Watch-Faces/`).
- `tsc --noEmit` + `npm run lint` clean from `app/`.
- `npm run deploy:full:private` succeeds; new bundle hash recorded in ISSUE_LOG.md per fix.
- No regression on default gauge pointer, default IMG_DATE, default TIME_POINTER on Balance/Active Max.

## Risks & Open Questions

- **#23 Part B (CANVAS_SIZE 480 vs watch 466 mismatch):** broader refactor — not in this spec. Will deliver Part A only (`||` → `??`) and confirm with user whether Part B should be a follow-up Spec 091.
- **#19/#20 weather set picker UX:** several viable shapes (Select dropdown vs grid of cards). Will mock + confirm before coding.
- **#22 month digit:** two viable options — extend Date toggle vs separate widget picker entry. Will confirm before coding.

## Execution Order (per user "one by one" rule)

1. #21 (trivial, isolated, safest) — validate spec loop end-to-end
2. #23 Part A (4 trivial `||` → `??` swaps in jsCodeGeneratorV2.ts)
3. #25 (gauge fallback in asset-injection loop)
4. #24 (AOD hub inherit + center fallback)
5. #22 (UI option; needs user choice between toggle vs picker)
6. #19 + #20 (combined; needs UX choice)
7. ISSUE_LOG.md update + final deploy verification

User must approve EACH item before edit. Deploy is grouped in two batches: trivial fixes (1–4) deploy together, UX fixes (5–6) deploy together.
