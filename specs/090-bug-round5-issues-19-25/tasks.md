# Spec 090 — Tasks

Sequential. **Each task requires user approval before edit.** Each task includes a 2-step-upstream + 2-step-downstream pipeline check before commit.

| ID | Bug | Title | Files | Status |
|----|-----|-------|-------|--------|
| T1 | #21 | `getPlaceholderText` honors `el.weekFormat` (full / short / initial) | `app/src/components/InteractiveCanvas.tsx` (~L1422) | pending |
| T2 | #23A | Replace `element.bounds.x \|\| N` falsy-zero fallbacks with `?? N` | `app/src/lib/jsCodeGeneratorV2.ts` (4 sites: IMG_DATE, IMG_MONTH, IMG_WEEK, GAUGE_POINTER) | pending |
| T3 | #25 | Asset-injection fallback to default needle when custom gauge source missing | `app/src/StudioApp.tsx` (~L3393–L3412) | pending |
| T4 | #24 | TIME_POINTER center fallback uses `config.resolution.width/2`; AOD inherits hub from main on add | `app/src/lib/jsCodeGeneratorV2.ts` (~L838) + `app/src/StudioApp.tsx` (AOD add path) | pending |
| T5 | #22 | Add Month Digit option (decision required: extend Date toggle vs new widget picker entry) | `app/src/components/PropertyPanel.tsx` (~L1670) + `app/src/StudioApp.tsx` (~L4593 picker, default subtype) | pending — needs UX decision |
| T6 | #19+#20 | Unified weather set picker (standard + custom Switcher Definitions) | `app/src/components/PropertyPanel.tsx` (~L1445) + InteractiveCanvas weather draw branch | pending — needs UX decision |
| T7 | — | `tsc --noEmit` + `npm run lint` from `app/` | — | pending |
| T8 | — | `npm run deploy:full:private` (batch 1: T1–T4) | — | pending |
| T9 | — | Post-deploy verify bundle hash + smoke-test each fixed bug on live URL | — | pending |
| T10 | — | `npm run deploy:full:private` (batch 2: T5–T6) | — | pending |
| T11 | — | Update ISSUE_LOG.md entries #19–#25 with resolution + commit + bundle hashes | `ISSUE_LOG.md` (root) | pending |

## Per-Task Pipeline-Consistency Checklist (must run before edit)

Before touching code at line L in file F:
1. Read L-30 .. L (upstream — what feeds this value?)
2. Read L .. L+30 (the change site)
3. Grep workspace for symbol/key being changed (downstream — who consumes it?)
4. If any consumer would break, surface to user and ask before adjusting.
5. Document the check in the task completion note.
