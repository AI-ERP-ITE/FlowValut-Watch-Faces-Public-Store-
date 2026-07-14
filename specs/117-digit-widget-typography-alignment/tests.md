# Spec 117 — Automated Test Design

## Test runner

Create `scripts/verifyDigitTypography.mjs`, runnable with:

```powershell
node scripts/verifyDigitTypography.mjs
```

The script must be non-interactive, deterministic, exit nonzero on failure, and write:

- `.verify-output/spec117/results.json`
- `.verify-output/spec117/report.md`

It may invoke compiled/pure TypeScript helpers through a small testable module or use source-contract assertions where browser APIs are unavailable. Canvas tests use the installed `canvas` package.

## Required suites

### A. Historical regression guards

- No active `MIN_INK_FRACTION` behavior.
- No active pair-correction table in runtime layout.
- No frame-derived target width passed into digit generation as an authority.
- No per-digit font-size variation.

### B. Typography geometry

- Render representative proportional and near-tabular fonts.
- Confirm all ten glyphs use the same requested font size and bitmap height.
- Confirm aspect ratio is preserved.
- Confirm natural advances are retained for proportional fonts.
- Record visible gaps for `11`, `18`, `31`, `58`, and `88`; do not enforce false equality between proportional pairs.

### C. Alignment

- For the same bounds/content width, validate Left, Center, and Right start X.
- Validate reset anchor preservation within ±1 px.
- Validate alignment normalization and legacy defaults.

### D. Range fitting

- STEP fits `99999`.
- CAL fits `9999`.
- BATTERY fits `100`.
- HEART fits its documented sample.
- Reset does not change font size or any unrelated fixture element.

### E. Export contract

- V2 and V3 `TEXT_IMG` emit the selected `align_h`.
- `IMG_TIME` still emits ten-digit arrays and zero-padding behavior.
- Numeric day remains valid in its selected mode.
- MAIN/AOD asset filenames do not collide.

### F. Persistence

- Serialize and deserialize a fixture containing MAIN and AOD digit widgets.
- Assert exact retention of `alignH`, `fontSize`, bounds, subtype, and data type.

## Background execution protocol

1. Start the script with output redirected to a timestamped log.
2. Poll until completion without blocking user communication for more than 60 seconds.
3. Parse `results.json` rather than relying only on console text.
4. Block build/deploy if any required test fails.

## Manual minimum

Automation reduces but does not eliminate device validation. After deployment, one installed-watch smoke test remains recommended for proportional-font time because native firmware layout cannot be fully emulated in Node.

