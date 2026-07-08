# Validation 115 — Surface 3D Effect

## T1 Gate
- [ ] `app/src/types/visualSpec.ts` compiles with zero TS errors
- [ ] `Surface3DParams` has all 4 fields: `mode`, `lightAngleDeg`, `depth`, `crispness`
- [ ] `AppearanceItem.surface3D` is optional (no existing spec breaks)

## T2 Gate
- [ ] SVG output contains `<feSpecularLighting>` and `<feDiffuseLighting>` when `surface3D` is set
- [ ] SVG output contains `<feDistantLight>` with correct azimuth for given `lightAngleDeg`
- [ ] Emboss and Engrave produce visually distinct outputs (azimuth differs by 180°)
- [ ] Two elements with different `depth` values get two separate `<filter>` defs (unique cache keys)
- [ ] Element with no `surface3D` = no extra filter added (existing behavior unchanged)

## T3 Gate
- [ ] "Surface 3D" panel appears in appearance editor for a text layer
- [ ] "Surface 3D" panel appears in appearance editor for an image layer
- [ ] "Surface 3D" panel appears in appearance editor for a shape layer
- [ ] Setting mode to "Off" removes `surface3D` from spec (or sets to null)
- [ ] Changing any slider updates the canvas preview within 1 render cycle

## T4 Gate
- [ ] Emboss text: digits look raised, highlight on light-side, shadow on opposite
- [ ] Engrave text: digits look sunken, reversed highlight/shadow vs emboss
- [ ] Emboss image: image edges appear raised
- [ ] Engrave image: image edges appear sunken
- [ ] Emboss shape: shape boundary appears raised
- [ ] Engrave shape: shape boundary appears sunken
- [ ] depth=1 → subtle, barely visible 3D
- [ ] depth=20 → very pronounced 3D
- [ ] crispness=0 → soft, blurred edges
- [ ] crispness=1 → sharp, hard edges
- [ ] Baked PNG in ZPK matches canvas preview appearance
