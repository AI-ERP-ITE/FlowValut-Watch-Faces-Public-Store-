# Spec 089 — Tasks

Sequential execution. Each task: edit → save → quick local lint/type check via `get_errors` before next.

| ID | Title | File | Status |
|----|-------|------|--------|
| T1 | Extend `RangeSlot` with `sourceHtml?` + `sourceHash?` | `app/src/types/imageSwitcher.ts` | pending |
| T2 | Extend `SlotMeta` + push HTML to Storage + pull HTML back + extend delete cleanup | `app/src/lib/imageSwitcherSync.ts` | pending |
| T3 | Add HTML editor / iframe preview / Bake button to slot row | `app/src/components/ImageSwitcherSlotRow.tsx` | pending |
| T4 | Confirm `ImageSwitcherLab` slot patch handler propagates new fields (no edit if `setSlots` spread already covers it) | `app/src/components/ImageSwitcherLab.tsx` | pending verify-only |
| T5 | Add iframe live preview to Gauge Pointer tab | `app/src/components/IconLab.tsx` | pending |
| T6 | Run `npm run lint` + `npm run build` from `app/`; fix any errors | — | pending |
| T7 | Update `ISSUE_LOG.md` #14, #15 to ✅ Resolved with commit hash + bundle hash references | `ISSUE_LOG.md` | pending |
| T8 | Deploy private: `npm run deploy:full:private` (killing dev server beforehand is optional — HMR race fixed in `deployDistToDocs.mjs`, ISSUE_LOG.md #16) | — | pending |
| T9 | Post-deploy verify: bundle hash on live private site, lab page loads, no console errors | — | pending |
| T10 | Post-deploy localhost verify: navigate to `localhost:5173/Watch-Faces/studio/parametric` — should load without restart (HMR race eliminated by code fix) | — | pending |
