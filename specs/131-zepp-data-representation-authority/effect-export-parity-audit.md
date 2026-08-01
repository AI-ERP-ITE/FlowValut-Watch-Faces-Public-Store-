# Existing Effect Controls — Canvas/ZPK Parity Audit

Date: 2026-08-01

| Existing control surface | Widget types | Canvas path | ZPK path | Finding / action |
|---|---|---|---|---|
| Pointer brightness, contrast, saturation, hue, opacity | Time Pointer, Gauge Pointer | `bakeDeterministicColorAdjustments` | `applyPointerEffectsForZPK` | Time Pointer already shared the deterministic adjustment contract. Custom Gauge Pointer export could not recover the custom-library source used by canvas; fixed by exact-key source resolution before baking. |
| Hand shadow, glow, trail, tint | Time Pointer | Pointer canvas composite | `applyPointerEffectsForZPK` after geometry preparation | Existing geometry-aware bake retained. |
| Icon hue, saturation, color fill | IMG, IMG_STATUS | `bakeDeterministicIconEffects` | `applyIconEffectsForZPK` | Existing shared deterministic bake retained. |
| Icon exposure, brightness, contrast, highlights, shadows, temperature, tint, sharpness, vignette | IMG, IMG_STATUS | `bakeDeterministicIconEffects` | `applyIconEffectsForZPK` | Existing shared extended photo-edit bake retained. |
| Main/AOD background photo editor | Background images | Saved edited raster | The saved edited raster is packaged directly | Existing save-before-package contract retained. |

This audit concerns raster editing controls. Native/dynamic widget styling and the
separate universal drop-shadow feature are not reclassified by this correction.

## Sunrise/Sunset runtime correction

The official Zepp data-type table documents `SUN_RISE` and `SUN_SET` as `HH:MM`,
and the Weather sensor exposes separate `sunrise.hour`, `sunrise.minute`,
`sunset.hour`, and `sunset.minute` values. A single bound `TEXT_IMG` produced a
raw three-digit value on hardware. Runtime generation now creates two
zero-padded two-digit `TEXT_IMG` widgets plus the baked colon `IMG`, refreshes
them from the Weather forecast, and retains independent main/AOD asset names.
