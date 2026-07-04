# specs/111-v3-manifest-and-packaging-no-risk-patch/tests.md

## Test Strategy
This track protects V2 by restricting initial implementation to V3-only manifest generation.

## Required V3 Checks
1. Generate one 466x466 round V3 package from Studio.
2. Extract outer `app.json`.
3. Extract `device.zip/app.json`.
4. Verify watchface path matches actual file placement convention.
5. Verify install QR flow no longer returns failed to load ZPK.

## Required V2 Non-regression Checks
1. No source changes in `jsCodeGeneratorV2.ts`.
2. If first pass is manifest-only, no V2 package extraction differences should exist because V2 code path was untouched.
3. If builder split is later introduced, generate one known V2 package and confirm extraction shape unchanged.

## Extraction Checklist
For each tested V3 package:
1. Outer zip opens successfully.
2. `device.zip` opens successfully.
3. `watchface` entry path exists where manifest expects it.
4. `app-side.zip` opens successfully.
5. Required thumbnail/icon metadata remains internally consistent.

## Decision Rules
1. If V3 install succeeds after manifest-only patch, stop and keep shared builder unchanged.
2. If V3 install still fails but extraction shape improves, continue to packaging-layer investigation.
3. If packaging-layer investigation implies shared behavior changes, create a dedicated V3 builder path before any shared mutation.