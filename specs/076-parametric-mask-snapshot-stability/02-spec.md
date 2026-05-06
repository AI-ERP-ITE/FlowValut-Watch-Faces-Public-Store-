# 02 - Functional Specification

## Problem Summary

Observed in parametric editor:

1. Applying mask can hide base geometry while overlay textures/effects remain visible.
2. Similar behavior appears on free rectangle object.
3. Heavy visual stacks can feel unstable with very sensitive output shifts.

## Scope In

1. Fix compositing consistency between base body and overlay branches.
2. Add clip-target guardrails for invalid inheritance targets.
3. Tune contrast fallback baseline only for unset values.
4. Add non-destructive element snapshot baking and source switching.
5. Add UI controls for snapshot lifecycle.

## Scope Out

1. Full renderer rewrite.
2. Redesign of parametric UX layout.
3. Automatic destructive snapshot replacement.

## Functional Requirements

### FR-1 Mask/Composite Consistency

Body and overlays must honor the same effective mask semantics so one cannot remain visible while the other is unintentionally removed.

### FR-2 Clip Target Guard

If inherited clip target is invalid, missing, or self-conflicting, renderer must fail safe to predictable behavior.

### FR-3 Contrast Fallback Safety

When explicit value is absent, fallback contrast baseline must be neutral and stable.
Explicit saved values must remain unchanged.

### FR-4 Snapshot Data Model

Each element can store snapshot metadata and choose render source mode:

1. Live render.
2. Snapshot render.

### FR-5 Deterministic Visual Hash

Element hash must change on visual input changes and remain stable for non-visual edits.

### FR-6 Snapshot Capture and Storage

Capture final visual output (alpha preserved), store snapshot, and persist metadata.

### FR-7 Renderer Source Switch

Element in snapshot mode uses snapshot image source while still honoring current visibility, transform, opacity, and masking.

### FR-8 UI Lifecycle Controls

Per-element controls:

1. Create Snapshot.
2. Use Snapshot.
3. Use Live Render.
4. Delete Snapshot.

### FR-9 Stale Indicator

If live visual hash differs from stored hash, snapshot is marked outdated without auto-delete.

## Non-Functional Requirements

1. Backward compatible with old projects.
2. Additive architecture only.
3. Predictable behavior in heavy visual stacks.
4. No hidden data-loss paths.

## Acceptance Criteria

1. Base and overlay no longer diverge unexpectedly under masks.
2. Free rectangle follows same stable behavior.
3. Snapshot toggling preserves visual parity within agreed tolerance.
4. Old project load/save remains valid.
5. Parametric route works after deploy verification.
