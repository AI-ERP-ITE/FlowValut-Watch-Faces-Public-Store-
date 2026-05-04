# Spec 073 — Mask Pipeline Review (Read-Only Audit)

**Type:** Review / audit only. **No code changes in this spec.**
Purpose: stop the cycle of partial fixes by producing one shared, evidence-based picture of:

1. What the mask pipeline is *supposed* to do (requirements).
2. What the code *actually* does (current behavior, with file:line citations).
3. Where they diverge (gaps).
4. Open questions that block a confident decision (clarify).
5. Candidate fixes / redesign options with trade-offs (propose).
6. A single executive report that ties it all together (report).

## Files in this spec

| File | Role |
|---|---|
| `requirements.md` | High-level target behavior + invariants. |
| `requirements.detailed.md` | Atomic per-step requirements (A–P). |
| `requirements.extended.md` | Extended atomic steps (A.19+ … Z). |
| `checklist.md` | Per-requirement pass/fail (high level). |
| `checklist.detailed.md` | Atomic per-step verification with citations. |
| `checklist.extended.md` | Extended atomic verification (A.19+ … Z). |
| `comparison.md` | Side-by-side: target flow vs actual flow per stage. |
| `clarify.md` | Open questions that must be answered before fix selection. |
| `propose.md` | Fix and redesign options, ranked, with trade-offs. |
| `report.md` | Executive summary: root causes, severity, recommended path. |

## Scope of review

- `app/engine/core/renderer.js` (mask def, silhouette, controller routing)
- `app/src/ParametricPage.tsx` (mask authoring, coordinate space, guides overlay, preview)
- Element/overlay clip mechanism (`resolveClipMaskBody`, `layerMaskRegistry`)
- Z-order interaction with mask (layering vs masking)

## Out of scope

- Implementation patches (next spec, after report is approved).
- Schema migration.
- Editor UX redesign.
