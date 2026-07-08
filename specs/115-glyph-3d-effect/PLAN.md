# Plan 115 — Surface 3D Effect (Universal)

## Status: PROPOSED

## Execution Order

Tasks must be done in strict order. Each task is a gate for the next.

1. **T1** — Extend type system (`visualSpec.ts`)
2. **T2** — Renderer: add `buildGlyph3DFilterDef()` + wire into `renderElement()`
3. **T3** — Identify + update UI appearance editor (add Glyph 3D controls panel)
4. **T4** — Validation: visual smoke test — render a text element with each mode and each param extreme

## Dependencies

```
T1 → T2 → T3 → T4
```

All sequential. T2 needs types from T1. T3 needs T1 for state shape. T4 needs T2+T3 done.

## No-Risk Guarantees

- T1 adds optional fields only — zero breaking change
- T2 adds a new code path, does not modify existing `buildFilterDef()`
- T3 is additive UI only
- The ZPK bake path is untouched throughout
