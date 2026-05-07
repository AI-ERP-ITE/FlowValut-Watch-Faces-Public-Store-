# 03 - Architecture

## Design Principles

1. Non-destructive state first.
2. One mask intent, two render sources.
3. Stable coordinate contract across transitions.

## High-Level Approach

### A. Canonical Procedural Record

- Keep procedural element params as source of truth.
- Snapshot remains cache/render-source option only.

### B. Mask Contract Alignment

- Use a mode-invariant mask frame contract for rendering.
- Prevent mask from being interpreted in incompatible frames across live/snapshot transitions.

### C. Transition Adapter

- At mode transition boundaries (fresh -> stale fallback, snapshot delete), apply deterministic frame adaptation so mask intent is preserved.

### D. Legacy Adapter

- Read legacy mask payloads and normalize into aligned contract at runtime.
- Do not rewrite or destroy original user data unexpectedly.

## Integration Points

1. `engine/core/renderer.js`
- mask primitive generation and layer compositing.
- snapshot/live transition behavior.

2. `engine/snapshot/snapshotRenderer.ts`
- snapshot capture metadata and frame assumptions.

3. `engine/snapshot/snapshotStorage.ts`
- snapshot delete/stale flow and status handling.

4. `src/ParametricPage.tsx`
- snapshot/mask/stroke operations and user actions.
- undo/redo path checks.

## Data Safety

1. Never delete procedural fields during snapshot operations.
2. Keep snapshot state removable without losing edit intent.
3. Preserve reversible behavior for all transitions.
