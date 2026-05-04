# Requirements — Mask Pipeline (Target Behavior)

Source: user statements during sessions on Spec 068–072 and live debugging.

## R1 — Authoring contract

- R1.1 User selects element → enables mask. **No visual change** to the element until at least one stroke or invert is applied.
- R1.2 Initial mask metadata: `enabled:true`, `mode:'brush'`, `invert:false`, default brush, `strokes:[]`, `coordinateSpace:'local'`.
- R1.3 User paints a **tiny hide stroke** on the element. Only the **brushed pixel area** is hidden. The rest of the element stays intact.
- R1.4 Reveal stroke + invert mode: only brushed area visible; rest hidden.
- R1.5 Mask edits captured in **selected-element local coordinates**, persisted as such.
- R1.6 Undo / redo / element switching: deterministic; no leaks across elements.

## R2 — Renderer contract

- R2.1 Mask is **per element instance**. Unique mask ID per render, no def reuse across instances.
- R2.2 The mask region must cover the same frame the element body is drawn in (origin-centered or top-left, but consistent).
- R2.3 Empty strokes + `invert:false` → mask inactive (no-op render).
- R2.4 Malformed stroke / NaN points → fail safe, treated as no-op, no crash, no full-cover primitive.
- R2.5 Mask MUST NOT affect any other element’s body or overlays.

## R3 — Effect propagation (silhouette-aware)

When mask is applied to element E with stroke S, all of E’s downstream effects must follow the **post-mask silhouette**:

- R3.1 Fill (texture / gradient / material overlays) clipped to new silhouette.
- R3.2 Drop shadow cast from new silhouette outline.
- R3.3 Depth / 3D effect computed from new silhouette outline.
- R3.4 Original stroke is clipped to surviving body (current native SVG behavior is acceptable).
- R3.5 (Stretch) New stroke along the cut edge — explicit follow-up, not required for v1 acceptance.

## R4 — Editor preview parity

- R4.1 The on-canvas mask preview overlay must show the same affected region the renderer will produce for that mask data.
- R4.2 “Global mask guides” toggle shows guides for **all** masks across **all** elements without crashing the page.
- R4.3 If element is rotated / offset, preview overlay must transform with the element so the brushed point stays under the user’s cursor visually.

## R5 — Cross-element isolation

- R5.1 Painting mask on element A must never alter the rendered geometry of element B.
- R5.2 Overlay clip targeting (`clip.targetName`) is a separate mechanism from mask and must not silently inherit mask data.
- R5.3 Z-order remains independent of mask; masking does not change paint order.

## R6 — Robustness / observability

- R6.1 Page must not crash on any mask state, including malformed JSON, missing arrays, NaN, very small or very large strokes.
- R6.2 Renderer should expose enough debug info (already partial via `renderSurfaceSourceDebugByLayer`) to verify which body/silhouette feeds each effect.

## R7 — Backwards compatibility

- R7.1 Legacy templates with `coordinateSpace:'global'` strokes must continue to render close to their original positions, OR be migrated on load.
- R7.2 No schema break that requires republishing existing watchfaces.

## Invariants (derived)

- INV1: For any element E, `silhouettePath = (mask.active) ? <g mask=url(M)>body</g> : body`.
- INV2: For any effect F belonging to E, F reads from `silhouettePath` or `geometryPath` of E only — never from another element.
- INV3: Mask region geometry MUST be a superset of the bounding box of `body` in the same coordinate frame. Otherwise the body is silently clipped to nothing.
- INV4: One element instance ⇒ one unique mask `<mask id>` ⇒ referenced exactly once.
