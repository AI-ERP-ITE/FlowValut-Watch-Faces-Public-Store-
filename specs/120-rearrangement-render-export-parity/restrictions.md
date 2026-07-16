# Spec 120 — Restrictions

- Do not change HTML parsing, rendering, baking, saved-source formats, or library behavior.
- Do not change TIME_POINTER, GAUGE_POINTER, digit, icon, switcher, IMG_LEVEL, IMG_PROGRESS, or animation engines.
- Do not alter local pivots, hand positions, natural asset dimensions, gauge normalized pivots, arc angles, or frame ordering.
- Do not rescale specialized raster assets merely because the canvas changes.
- Do not automatically mirror later MAIN edits into AOD.
- Do not perform coordinate conversion inside V2/V3 generators or the ZPK packer.
- Do not modify Firebase data, Functions, Firestore, Storage, or authentication.
- Do not push to the public remote.
- Keep specification and runtime commits separate.

