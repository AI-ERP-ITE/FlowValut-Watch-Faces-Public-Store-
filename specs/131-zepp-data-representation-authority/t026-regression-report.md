# T026 — Full Regression and Package Audit

**Date:** 2026-08-01  
**Deployment:** Not performed  
**Private build index SHA-256:** `EA9AFC343AB7EF0605BD7CE94BD6B4E05E5FD0C0E068F3DF146F385E51C10C11`

## Results

| Gate | Result | Verdict |
|---|---:|---|
| Spec 131 focused suite | 23 files, 104 tests passed | Pass |
| TypeScript project build | Passed | Pass |
| Private Firebase preflight | Passed | Pass |
| Private Vite production build | Passed; 8,235 modules | Pass |
| Headless pipeline verifier | 57 passed, 0 failed | Pass |
| Nested ZPK contract inspection | All generated PNG references present exactly once | Pass |
| `git diff --check` | No whitespace errors; line-ending notices only | Pass |
| System B change scan | No System B diff from Spec 131 work | Pass |
| Physical watch | Requires deployed build and installed generated ZPK | Pending T027/post-deploy |

Private bundle files:

- `index-BP_LPdoB.js` — 2,109,723 bytes
- `index-BwGav05S.js` — 102,478 bytes
- `index-wLIbbYR0.css` — 94,866 bytes
- `tablerIconRenderer-a__z3u9D.js` — 223,005 bytes

## Full-suite baseline failures

The unfiltered repository suite completed with **311 passed and 16 failed
tests**, plus **8 failed suite-loading entries**. No Spec 131 test failed.

| Group | Count | Classification |
|---|---:|---|
| Effects/snapshot rendering assertions | 10 | Existing engine behavior/test drift, outside Spec 131 |
| Radial tick length | 1 | Existing engine behavior/test drift, outside Spec 131 |
| System B parity tests | 5 | Broken path assumption plus deliberately deferred A/B synchronization |
| Standalone `.mjs` scripts collected as Vitest | 3 suites | Test-runner configuration issue; scripts pass when executed directly |
| Test without imported Vitest globals | 1 suite | Test harness issue |
| Removed `jsCodeGeneratorV2.ts` imports | 4 suites | Obsolete test/verification infrastructure |

The digit typography verifier is also blocked by its obsolete hard dependency on
`src/lib/jsCodeGeneratorV2.ts`. This does not affect the current System A
generator, the private build, or the clean Spec 131 package inspection.

## Generated package inspection

`spec131PackageInspection.test.ts` builds and reopens a real nested ZIP/ZPK
structure containing generated `app.json`, `app.js`, `watchface/index.js`, and
assets. It verifies:

- canonical `PAI_DAILY` and `FAT_BURNING` bindings;
- no obsolete `PAI`/`FAT_BURN` runtime constants;
- Distance `dont_path` decimal asset;
- Weather and Moon runtime bindings;
- 101-index Humidity/BioCharge range arrays;
- every quoted PNG runtime reference exists exactly once in `device.zip`.

## Physical-watch matrix

These rows cannot truthfully pass before T027 deploys the editor and a generated
ZPK is installed. They are the required post-deploy acceptance checklist.

| Scenario | Required observation | Status |
|---|---|---|
| Weather Condition custom set | Codes 0, 3, 25, and 28 show their matching custom icons | Pending |
| Current/Low/High Temperature | Negative and >100°F values retain sign and degree glyph without clipping | Pending |
| Humidity ranges | 0/30, 31/60, and 61/100 switch at exact configured boundaries | Pending |
| BioCharge Numeric | Live score appears on supported firmware | Pending |
| BioCharge Arc/Gauge | 0/50/100 map to start/mid/end | Pending |
| BioCharge ranges | Custom user ranges switch at exact boundaries | Pending |
| Sunrise/Sunset | Both `HH:MM` readings match the watch weather data | Pending |
| Moon | Existing 7/13/30 set advances correctly; no behavior change expected | Pending |
| Daily PAI/Fat Burning | Live values render through canonical identifiers | Pending |
| Distance | Decimal point appears and uses the selected digit style | Pending |
| Air Pressure | Value represents pressure, not altitude | Pending |
| SpO₂ | Numeric/Arc/Gauge behave within 51–100 | Pending |
| AQI | Warning is visible; live value tested only in a supported region | Pending/region-gated |
| Legacy FVWF | Old PAI/Fat Burning/switcher assets open and generate unchanged | Pending |

## Release verdict

System A is software-build ready for a **private deployment test**. T027 still
requires explicit approval. Production/store publication remains gated on the
physical-watch rows above; deployment itself is not evidence that device
behavior passed.
