# 02 - Functional Specification

## Problem Statement

After masking, certain follow-up actions (such as stroke edits or deleting snapshot) can make base alpha disappear while effects remain visible.

## Scope In

1. Non-destructive alpha preservation across live and snapshot modes.
2. Stable mask behavior independent of render mode.
3. Safe transition behavior for snapshot stale/delete paths.
4. Compatibility with existing saved projects.

## Scope Out

1. Full renderer rewrite.
2. Broad UI redesign.
3. Breaking migration of existing project files.

## Functional Requirements

### FR-1 Canonical Non-Destructive Source

Procedural element state remains canonical and must never be replaced destructively by snapshot image data.

### FR-2 Mode-Invariant Mask Behavior

Mask intent must remain visually consistent when rendering source changes between live and snapshot.

### FR-3 Alpha Preservation

Base alpha must remain present after:

1. snapshot -> mask -> stroke edit
2. snapshot -> mask -> delete snapshot
3. live -> mask -> snapshot -> live

### FR-4 Transition Safety

When snapshot becomes stale or is deleted, transition to live rendering must preserve mask alignment and avoid alpha collapse.

### FR-5 Flexible Workflow Support

All user orders remain valid:

1. live -> mask
2. live -> snapshot -> mask
3. live -> mask -> snapshot

### FR-6 Undo/Redo Integrity

Undo/redo must continue to restore pre-change visual state for mask, stroke, and snapshot actions.

### FR-7 Backward Compatibility

Legacy mask data must load without breakage and be adapted safely to the new alignment model.

## Non-Functional Requirements

1. Additive changes only.
2. No destructive data writes.
3. Stable behavior under heavy effect stacks.
4. Test-backed with focused regressions.

## Acceptance Criteria

1. No base-alpha disappearance in target flows.
2. Effects do not appear without corresponding base in target flows.
3. Delete snapshot restores procedural preservation state without misalignment.
4. Undo/redo works for snapshot and mask transitions.
5. Existing projects load and render acceptably.
