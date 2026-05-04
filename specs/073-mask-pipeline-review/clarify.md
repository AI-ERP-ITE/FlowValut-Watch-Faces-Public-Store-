# Clarify — Open Questions Before Selecting a Fix

These must be answered (or explicitly deferred) before the propose-stage choice is locked in.

## Q1 — Coordinate space for masks: pick one and freeze it

The current code carries both `'global'` and `'local'` modes. Each renders the same data to a different place.

- Q1.a Should new edits be **always local**? (Current intent.)
- Q1.b Do we keep a runtime read-path for legacy `'global'` masks, or migrate them once on load and drop the renderer branch?
- Q1.c If migrated, who owns the migration: editor on open, or a one-shot script over `app/docs/zpk/*`?

**Default recommendation if no answer:** local-only at the renderer boundary, plus an editor-side load-time migration; legacy field allowed in storage but normalized before render.

## Q2 — Element body frame contract

Today element body is rendered around origin and wrapped with `translate(x,y) rotate(r)`. The renderer mask region must match this. Two viable contracts:

- Q2.a **Origin-centered local frame:** body and mask both use `[-W/2,+W/2]`. Region `(-W/2,-H/2,W,H)`. Cleaner; no extra translate.
- Q2.b **Top-left local frame:** body translated to `(W/2,H/2)` first; region `(0,0,W,H)`. Matches today’s region attr but needs an extra body wrap.

Need to pick one. **Recommendation:** Q2.a — minimum diff, matches how all element render functions currently emit geometry.

## Q3 — Element bounding box for mask region

Mask region currently sized to canvas `(W,H)`. For very small elements (a tick mark) this means a huge mask region around a small body — fine for SVG, but wasteful and makes brush size scaling unintuitive.

- Q3.a Keep canvas-sized region (simple, current behavior).
- Q3.b Per-element bounding box region (requires elements to expose a bbox or a geometry-extent helper).

**Recommendation:** Q3.a for v1; revisit in a follow-up only if performance or UX demands.

## Q4 — Brush coordinate units

Brush stroke `points` are in `[0,100]` percentages. That makes brush size feel different on different element bbox sizes.

- Q4.a Keep percent-of-canvas; accept perceived size drift.
- Q4.b Switch to percent-of-element-bbox (couples to Q3.b).
- Q4.c Switch to absolute pixels in element-local frame.

**Recommendation:** Q4.a v1; document the limitation.

## Q5 — Overlay clip vs mask: are they intentionally separate?

`clip.targetName` lets a texture/gradient/material clip its painting to **another element’s body**. This is independent of the mask system — but the current implementation has a **double-transform bug** (D4 in comparison).

- Q5.a Is this feature actually used in any saved template?
- Q5.b If yes, is the intended frame "world canvas coords" (then overlay group must NOT be inside element’s rotated transform) or "current element local coords" (then `worldBody` must be transformed back to local)?
- Q5.c If unused, freeze the feature behind a flag and fix later.

**Recommendation:** check repo templates for `clip.targetName` usage; if zero, gate the feature off until properly redesigned.

## Q6 — Cut-edge stroke (R3.5)

User mentioned that masked rect should still show its stroke along the cut edge.

- Q6.a Defer to v2 (acceptable per R3.5).
- Q6.b Implement now via `feMorphology`-derived edge stroke.

**Recommendation:** Q6.a — unblock v1 with silhouette correctness first.

## Q7 — Preview rendering technology

Preview overlay is React-drawn SVG separate from the engine renderer. Two paths can drift forever.

- Q7.a Keep dual-path; enforce a shared coordinate helper module imported by both.
- Q7.b Replace overlay with a thumbnail using the actual engine renderer (slower, heavier).

**Recommendation:** Q7.a.

## Q8 — Acceptance evidence required

What proves the fix worked?

- Q8.a Manual screenshot matrix on `?p=/studio/parametric` (rotated rect, masked, with texture, with depth).
- Q8.b A node test that snapshots renderer SVG for a known mask scenario and asserts mask region geometry.
- Q8.c Both.

**Recommendation:** Q8.c — add a single snapshot test (cheap) plus the manual matrix.

---

## Hard blockers (must answer)

- **B1** Q1.a/b — coordinate-space ownership.
- **B2** Q2.a/b — body/mask frame contract.
- **B3** Q5.a — is `clip.targetName` in use?

## Soft (defaults usable)

- Q3, Q4, Q6, Q7, Q8 — recommendations above.
