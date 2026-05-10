import type { RenderSourceMode } from '../types/renderSourceMode';
import { isRenderSourceMode } from '../types/renderSourceMode';

type AnyRecord = Record<string, unknown>;

/**
 * One-time migration: stamps an explicit `renderSourceMode` and
 * `maskEmbeddedInSnapshot` on a legacy element. Idempotent — if the element
 * already carries a valid `renderSourceMode`, the element is returned
 * unchanged.
 *
 * Migration logic:
 *   no snapshot                              -> procedural
 *   snapshot exists + element.mask present   -> baked-live-mask
 *   snapshot exists + no element.mask        -> baked-baked-mask
 *
 * After this runs once at load/normalize time, `renderSourceMode` is the
 * SINGLE source of truth. The renderer/resolver MUST NOT re-infer.
 */
export function migrateElementRenderSourceMode<T extends AnyRecord>(element: T): T {
  if (!element || typeof element !== 'object') return element;
  const renderStateRaw = (element as AnyRecord).renderState;
  const renderState: AnyRecord =
    renderStateRaw && typeof renderStateRaw === 'object' ? { ...(renderStateRaw as AnyRecord) } : {};

  // Idempotency: respect any existing explicit value.
  if (isRenderSourceMode(renderState.renderSourceMode)) {
    return element;
  }

  const snapshot = renderState.snapshot;
  const hasSnapshotPixels =
    !!snapshot &&
    typeof snapshot === 'object' &&
    typeof (snapshot as AnyRecord).imageDataUrl === 'string' &&
    ((snapshot as AnyRecord).imageDataUrl as string).length > 0;

  const mask = (element as AnyRecord).mask;
  const hasLiveMask = !!mask && typeof mask === 'object';

  let mode: RenderSourceMode;
  let maskEmbeddedInSnapshot: boolean;

  if (!hasSnapshotPixels) {
    mode = 'procedural';
    maskEmbeddedInSnapshot = false;
  } else if (hasLiveMask) {
    mode = 'baked-live-mask';
    maskEmbeddedInSnapshot = false;
  } else {
    mode = 'baked-baked-mask';
    maskEmbeddedInSnapshot = true;
  }

  return {
    ...(element as AnyRecord),
    renderState: {
      ...renderState,
      renderSourceMode: mode,
      maskEmbeddedInSnapshot,
    },
  } as unknown as T;
}

/**
 * Pure helper: read the migration-decided mode without mutating the element.
 * Useful in tests and inspectors.
 */
export function inferLegacyRenderSourceMode(element: unknown): RenderSourceMode {
  if (!element || typeof element !== 'object') return 'procedural';
  const rs = (element as AnyRecord).renderState;
  const renderState: AnyRecord = rs && typeof rs === 'object' ? (rs as AnyRecord) : {};
  if (isRenderSourceMode(renderState.renderSourceMode)) return renderState.renderSourceMode;
  const snapshot = renderState.snapshot as AnyRecord | undefined;
  const hasSnapshotPixels =
    !!snapshot && typeof snapshot.imageDataUrl === 'string' && (snapshot.imageDataUrl as string).length > 0;
  const hasLiveMask = !!(element as AnyRecord).mask && typeof (element as AnyRecord).mask === 'object';
  if (!hasSnapshotPixels) return 'procedural';
  return hasLiveMask ? 'baked-live-mask' : 'baked-baked-mask';
}
