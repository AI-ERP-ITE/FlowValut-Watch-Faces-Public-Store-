# Spec 117 — Git History Audit Summary

| Date | Commit | Approach | Result |
|---|---|---|---|
| 2026-07-06 | `56211f7b` | 100 pair optical-correction table | Preview-only; not represented in generated Zepp runtime |
| 2026-07-06 | `b38e6498` | One widest bitmap cell for all digits | `11` gap 22 px; failed proportional fonts |
| 2026-07-06 | `90b3e63a` | Bounds-derived cells/fill ratios | Reintroduced frame/font coupling |
| 2026-07-07 | `14ec6498` | Per-digit natural advances | Current baseline; preserves proportional font appearance |
| 2026-07-07 | `87a1863c` | Store sample-derived `layoutStartX` | Improved preview/device parity for sample, but cannot center every proportional runtime pair |
| 2026-07-11 | `9685a5bc` | Font size updates no longer touch bounds | Prevented linked decorative-frame corruption |

## Decisions carried into Spec 117

1. Keep natural advances for proportional fonts.
2. Never enlarge individual narrow glyphs.
3. Never use preview-only pair corrections as device truth.
4. Never derive glyph scale from frame width.
5. Treat alignment and frame fitting as geometry, not typography scaling.
6. Preserve the July 11 selected-element-only font-size behavior.

