# Quickstart: Restore Pointer Bake Parity and Export Sizing (Feature 032)

## 1. Preconditions

- Work from `app/` directory.
- Keep scope restricted to TIME_POINTER bake parity and export sizing/pivot correctness.
- Have at least one reproducible pointer fixture with custom hand style and one with built-in hand style.

## 2. Prepare build and run context

```powershell
Set-Location "d:\Zepp Watchface maker website\Kimi_Agent_Untitled Chat\app"
npm install
npm run build
```

Expected outcome: successful build with updated bundled assets.

Enable investigation mode in browser session:

```javascript
localStorage.setItem('wf.investigationMode', '1');
localStorage.setItem('wf.investigationOperator', 'parity-owner');
```

Create run record skeleton:

```powershell
npm run investigation:capture -- --operator parity-owner --fixture pointer-pack-custom-01 --issue pointer --buildHash local-dev
```

## 3. Execute parity+sizing run (single fixture)

1. Preview stage
   Capture composer-preview parity snapshot and screenshot evidence.
2. Export preparation stage
   Confirm export snapshot is cloned from current config and custom hand pivots are resolved.
3. Pointer bake stage
   Ensure hand assets are regenerated and pointer effects applied with normalized values.
4. Asset reference gate
   Verify referenced pointer asset names exist before ZPK build.
5. Baked export stage
   Capture baked-export parity snapshot and complete ZPK build.
6. Extraction stage
   Extract `watchface/index.js` and `app.json`; verify TIME_POINTER coordinates and manifest references.
7. Device stage
   Deploy build, run repeated launches/resumes, and capture parity behavior.

## 4. Required checks per run

- Pointer parity check pass/fail with mismatch details.
- Export sizing record for hour/minute/second/cover layers.
- Missing pointer asset count (must be zero).
- Extracted JS/app manifest checks logged.

## 5. Validators

Run validators after each run batch:

```powershell
npm run investigation:validate:nonintrusive
npm run investigation:validate:zpk
npm run investigation:validate:manifest
npm run investigation:validate:minimums -- --matrix specs/032-device-parity-root-cause/investigation/device-matrix-filled.csv --report specs/032-device-parity-root-cause/investigation/run-minimums-report.md
npm run investigation:validate:sc001 -- --planned specs/032-device-parity-root-cause/investigation/templates/device-matrix.csv --actual specs/032-device-parity-root-cause/investigation/device-matrix-filled.csv --report specs/032-device-parity-root-cause/investigation/sc001-matrix-integrity-report.md
npm run investigation:validate:coverage -- --matrix specs/032-device-parity-root-cause/investigation/device-matrix-filled.csv --report specs/032-device-parity-root-cause/investigation/device-coverage-gate-report.md
```

## 6. Pass/stop criteria

- PASS when pointer parity tolerance is met, export sizing metrics are internally consistent, and device verification does not show regression.
- STOP and mark high-risk when any of these occur:
  - missing pointer assets before build
  - parity drift across deterministic repeat comparisons
  - extraction/device mismatch not explainable by captured sizing metrics

## 7. Output bundle

Produce investigation artifacts using:

- `contracts/investigation-run-record.schema.json`
- `contracts/instrumentation-events.schema.json`
- `contracts/evidence-pack-manifest.schema.json`
