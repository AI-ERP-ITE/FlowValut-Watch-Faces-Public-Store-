# Plan: Gauge Pointer Editor Parity + Visual Transform Completion

## Stage-Gated Flow (specsmd-mater)
1. ANALYZE
2. LOCATE
3. CLARIFY
4. PLAN
5. CONFIRM (`approve` or `proceed`)
6. IMPLEMENT
7. BUILD
8. DEPLOY
9. VERIFY

## Sequential Implementation Plan
1. **Spec Initialization**
   - Create 037 spec bundle (`spec.md`, `plan.md`, `tasks.md`, `process.md`).

2. **Type + Model Bridge**
   - Extend `WatchFaceElement` with `pivotX` / `pivotY` for `GAUGE_POINTER`.
   - Keep backward compatibility with old `hourPos` fallback.

3. **Default Pointer Asset Fallback**
   - Add deterministic pointer fallback utility producing PNG-compatible data URL.
   - Ensure add-element defaults and export pipeline always resolve a valid pointer source.

4. **Editor/Property Parity**
   - Add GAUGE_POINTER property controls:
     - image src
     - pivotX/pivotY
     - start/end angle
   - Keep box editing (`x/y/width/height`) enabled like first-class elements.

5. **Preview Rendering Completion**
   - Add explicit GAUGE_POINTER draw path in canvas renderer.
   - Apply rotation simulation + pivot-origin math.
   - Apply same shadow/effect hooks where applicable.

6. **Generator Conversion Bridge**
   - Convert editor model to Zepp IMG_POINTER params in both V3 and V2 generators.
   - Ensure `src` is always non-empty and package-resolvable.

7. **Bake/Export Parity**
   - Ensure GAUGE_POINTER source image is packaged into `elementFiles` before `buildZPK`.
   - Apply image effect/shadow bake path parity for GAUGE_POINTER where enabled.

8. **Verification**
   - Run build.
   - Run pointer sample ZPK creation.
   - Run parity validator on extracted package.
   - Verify docs deploy hash update if deployment requested.
