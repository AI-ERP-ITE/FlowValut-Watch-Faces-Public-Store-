# Tasks - Spec 068 Local Mask Coordinate Contract

## Execution Order (one-by-one)

- [ ] T1: Renderer contract patch (`app/engine/core/renderer.js`)
  - Keep unique instance mask IDs
  - Remove coordinate double-transform paths
  - Enforce mask/element same transformed group contract

- [ ] T2: Authoring coordinate patch (`app/src/ParametricPage.tsx`)
  - Convert canvas pointer coordinates into selected-element local mask coordinates
  - Keep existing mask object shape

- [ ] T3: Verification
  - Run type/error checks for touched files
  - Run targeted runtime mask probe for unique IDs and mask usage

- [ ] T4: Build + deploy
  - `npm run deploy:docs:private`
  - Verify docs + root hash parity and live CDN propagation

- [ ] T5: Commit + push
  - Commit implementation + deploy artifacts
  - Push `main`
  - Verify live routes and asset status
