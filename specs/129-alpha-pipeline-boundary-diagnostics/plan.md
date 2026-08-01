# Spec 129 — Execution Plan

## Execution Rule

Tasks execute strictly in dependency order. After each task:

1. Record commands and evidence.
2. Mark PASS, FAIL, or BLOCKED.
3. Update `scorecard.md`.
4. Stop before the next task in accordance with the repository's controlled
   Zepp-system workflow.

No failed task may be silently bypassed. A blocked physical/tool boundary does
not prevent independent machine tests, but it prevents a conclusive G8 verdict.

## Phase A — Baseline and fixture

1. Audit relevant current source paths and historical evidence.
2. Create the immutable RGBA fixture and coordinate manifest.
3. Create the PNG inspection/comparison harness.
4. Validate fixture integrity and reference composites.

## Phase B — FlowVault routes

5. Test browser canvas round-trip.
6. Test static image pass-through.
7. Test image normalization.
8. Test image-switcher frame handling.
9. Test week/month label baking.
10. Test numeric glyph baking.
11. Test effects/photo-edit baking.
12. Test pointer/hand handling.
13. Revalidate the binary-alpha compatibility control.

## Phase C — Package boundary

14. Build diagnostic packages without production deployment.
15. Extract outer ZPK and nested `device.zip`.
16. Compare every pre-package and extracted PNG.
17. Inspect `watchface/index.js` and `app.json` asset references.

## Phase D — Official and firmware boundaries

18. Discover and validate available official Zepp tooling.
19. Build untouched per-pixel-alpha and widget-opacity official packages when
    tooling is available.
20. Measure official packaged resources.
21. Produce isolated installation ZPKs and QR codes.
22. Capture digital watch screenshots through an available connected route.

## Phase E — Verdict

23. Complete hypothesis matrix and first-divergence map.
24. Calculate weighted score and mandatory gates.
25. Issue the root-cause verdict and only then propose a production fix.

## Safety

- Diagnostic scripts and artifacts remain inside Spec 129 or `app/scripts/`.
- No production generator behavior is changed during investigation.
- No Firebase or public/private application deploy is required.
- Any private diagnostic upload must remain isolated from catalog/admin paths.
- Specs and implementation/test harness changes must remain separate commit
  classes if commits are requested.

