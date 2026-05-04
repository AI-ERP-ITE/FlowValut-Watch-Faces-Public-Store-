# Verification Strategy (066)

## Per-Task Verification
1. Evidence diff for each completed task.
2. Localized non-regression checks on touched renderer/controller paths.
3. Risk note update before moving to next task.

## Final Verification Matrix
1. Style FX edge-sensitive controls respond to masked silhouette edges.
2. Depth FX falloff/spread/lighting response follows masked silhouette.
3. Drop Shadow all modes use masked silhouette boundaries.
4. Global Light 2D boundary sampling uses silhouette contour.
5. Global Light 3D edge response uses silhouette-derived edge/normal approximation.
6. Texture layer UV/rotation/offset behavior unchanged.
7. Gradient Separate center/rotation/scale behavior unchanged.
8. Material layer composition behavior unchanged.
9. Pivot/transform interactions unchanged in editor interactions.
10. Build/type/verify scripts pass.

## Evidence Requirements
1. Before/after screenshots or deterministic render snapshots for masked edge cases.
2. Confirmed no-op diff for unrelated controls.
3. Hash parity and live asset checks for deployment when deployment is performed.
