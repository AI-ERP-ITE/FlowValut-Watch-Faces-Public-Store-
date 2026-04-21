# Spec 030 - Task Tracker

## Status Legend
- [ ] not started
- [~] in progress
- [x] done

## Execution Rule
Per user request: after second confirmation, execute one task at a time and pause for recheck before continuing.

---

[x] T1 - Create Pointer Composer UI skeleton
- Add new composer section in hand workflow.
- Add four editors: Hour HTML, Minutes HTML, Seconds HTML, Hub HTML.
- Add preview canvas placeholder and validation badges.

Checkpoint after T1:
- User confirms layout and field labels.

[x] T2 - Add composer state model
- Introduce state fields for four source snippets and per-hand pivot offsets.
- Ensure state survives local interactions before save.

Checkpoint after T2:
- User confirms values persist while editing.

[x] T3 - Implement independent layer renderers
- Parse and render each source input independently.
- Return explicit per-layer errors, no silent fallback.

Checkpoint after T3:
- User confirms each layer can fail independently without contaminating others.

[x] T4 - Build composed preview renderer
- Hub centered.
- Hands drawn with default demo angles:
  - Hour 60 deg (2 PM)
  - Minute 300 deg (10 PM mark)
  - Second 0 deg (12 AM)
- Add center crosshair.

Checkpoint after T4:
- User confirms visual composition baseline.

[x] T5 - Add pivot controls
- Add per-hand X/Y sliders or steppers relative to hub center.
- Live-update preview on every change.
- Add reset per hand.

Checkpoint after T5:
- User confirms he can move hand anchor to increase/decrease pre-hub tail.

[x] T6 - Persist composed hand preset in store
- Extend custom hand record schema with separate sources and pivot offsets.
- Keep backward compatibility with legacy records.

Checkpoint after T6:
- User confirms preset saves and reloads correctly.

[x] T7 - Wire selection into TIME_POINTER
- On selecting composed style, apply stored pivot offsets/positions to TIME_POINTER fields.
- Ensure hub source maps to cover asset.

Checkpoint after T7:
- User confirms pointer alignment in editor after selecting style.

[x] T8 - Export path integration
- Export hour/minute/second/hub assets from separated layers.
- Ensure no cross-layer bleed in output files.

Checkpoint after T8:
- User confirms generated watch output has clean separated hands.

[x] T9 - Regression and compatibility pass
- Verify legacy custom-hand presets still work.
- Verify no break in existing handStyle workflow.

Checkpoint after T9:
- User confirms old styles still usable.

[x] T10 - Deployment and verification
- Build, deploy docs parity, push.
- Record hash parity and commit references.

Checkpoint after T10:
- User validates final behavior on device.
