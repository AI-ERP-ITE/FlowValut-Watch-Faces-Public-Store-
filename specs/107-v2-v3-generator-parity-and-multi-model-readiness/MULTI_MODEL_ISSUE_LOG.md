# Multi-Model Process Issue Log

Dedicated issue log for multi-model + V2/V3 parity track only.

| ID | Title | Status | Priority | Area | Notes |
|---|---|---|---|---|---|
| MM-001 | V3 generator parity audit incomplete vs V2 | Open | Critical | `jsCodeGenerator.ts` / `jsCodeGeneratorV2.ts` | Need formal parity closure before routing shift to metadata-first V3 preference |
| MM-002 | Hardcoded model-to-generator routing | Open | High | `jsCodeGenerator.ts` | Replace with `models.json` + `specGroups.json`-driven selection policy |
| MM-003 | Editor preview uses fixed square assumptions | Open | High | `InteractiveCanvas.tsx` | Causes non-square model preview mismatch |
| MM-004 | Background helpers use single-dimension assumptions in some paths | Open | High | `StudioApp.tsx` | Non-square model background sizing can desync from target resolution |
| MM-005 | AOD generation behavior differs between V2 and V3 | Open | Critical | generator output | V2 has richer explicit AOD branch behavior; parity decisions required |
| MM-006 | Pointer placement parity across square/round not fully validated | Open | Medium | canvas + export parity | Need explicit matrix tests for element-local pivot invariance |
