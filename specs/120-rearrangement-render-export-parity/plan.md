# Spec 120 — Implementation Plan

1. Correct the pure rearrangement helper: transform all project-space anchors/centers, add conservative safe-size handling, and protect engine-local fields.
2. Extend the pending load transaction with the selected target model identity.
3. Normalize the dedicated background raster during confirmed rearrangement and update the matching background element bounds/source without touching HTML element engines.
4. Ensure MAIN/AOD local editor state and saved config receive the same converted snapshot.
5. Add export preflight/normalization so the packaged background matches project resolution and generators consume coordinates exactly once.
6. Add focused 480↔466 and rectangular tests covering ordinary widgets, TIME_POINTER HTML/PNG metadata, MAIN/AOD, model adoption, background dimensions, and V2/V3 output.
7. Run TypeScript, focused/full tests, verifier, private build, private deployment, and live route/hash checks.

