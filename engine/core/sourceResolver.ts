import type {
  RenderSourceMode,
  SurfaceSource,
  SilhouetteSource,
} from '../../src/types/renderSourceMode';
import { isRenderSourceMode } from '../../src/types/renderSourceMode';

/**
 * Pure source resolver. Phase 1 SCAFFOLD ONLY — these functions are not yet
 * wired into the renderer. They establish the contract that future renderer
 * routing changes will consume.
 *
 * STRICT RULES:
 *  - The resolver consumes ONLY explicit metadata:
 *      - renderState.renderSourceMode
 *      - renderState.maskEmbeddedInSnapshot
 *      - renderState.snapshot
 *      - element.mask (current live mask)
 *  - The resolver MUST NOT consult original geometry history, previous
 *    silhouette caches, source ancestry, snapshot rectangle bounds, or any
 *    pre-mask fallback.
 *  - The resolver MUST NOT mutate the element.
 */

type AnyRecord = Record<string, unknown>;

type SnapshotShape = {
  imageDataUrl?: string;
  width?: number;
  height?: number;
};

function readRenderState(element: AnyRecord): AnyRecord {
  const rs = element && typeof element === 'object' ? element.renderState : null;
  return rs && typeof rs === 'object' ? (rs as AnyRecord) : {};
}

function readSnapshot(renderState: AnyRecord): SnapshotShape | null {
  const snap = renderState.snapshot;
  if (!snap || typeof snap !== 'object') return null;
  return snap as SnapshotShape;
}

function readLiveMask(element: AnyRecord): AnyRecord | null {
  const mask = element && typeof element === 'object' ? element.mask : null;
  return mask && typeof mask === 'object' ? (mask as AnyRecord) : null;
}

function readMaskKey(mask: AnyRecord | null): string | null {
  if (!mask) return null;
  const enabled = mask.enabled;
  if (enabled === false) return null;
  // Use shape, kind, or imageDataUrl as a stable identity key. Resolver does
  // not interpret the mask — it only emits a key the renderer can use.
  const candidates = ['id', 'kind', 'shape', 'mode', 'imageDataUrl'] as const;
  for (const key of candidates) {
    const value = mask[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return 'live';
}

function readElementId(element: AnyRecord): string {
  const id = element && typeof element === 'object' ? element.id : null;
  return typeof id === 'string' && id.length > 0 ? id : '';
}

/**
 * Read the canonical render-source mode for the element. Trusts ONLY the
 * explicit `renderState.renderSourceMode` field. If absent, returns
 * 'procedural' as the safe default. Migration is responsible for stamping
 * the correct value on legacy elements at load time — this resolver does
 * NOT re-infer.
 */
export function resolveRenderSourceMode(element: unknown): RenderSourceMode {
  if (!element || typeof element !== 'object') return 'procedural';
  const rs = readRenderState(element as AnyRecord);
  const mode = rs.renderSourceMode;
  return isRenderSourceMode(mode) ? mode : 'procedural';
}

/**
 * Resolve the visible surface source for THIS layer.
 *  - procedural          → procedural render of this element
 *  - baked-live-mask     → baked image (mask is applied separately as silhouette)
 *  - baked-baked-mask    → baked image (mask already in pixels)
 */
export function resolveSurfaceSource(element: unknown): SurfaceSource {
  if (!element || typeof element !== 'object') {
    return { kind: 'procedural', elementId: '' };
  }
  const el = element as AnyRecord;
  const mode = resolveRenderSourceMode(el);
  const elementId = readElementId(el);

  if (mode === 'procedural') {
    return { kind: 'procedural', elementId };
  }

  const snapshot = readSnapshot(readRenderState(el));
  if (!snapshot || typeof snapshot.imageDataUrl !== 'string' || snapshot.imageDataUrl.length === 0) {
    // Baked mode declared but snapshot pixels missing — degrade safely to
    // procedural surface. Resolver does NOT attempt recovery from history.
    return { kind: 'procedural', elementId };
  }

  return {
    kind: 'baked-image',
    imageDataUrl: snapshot.imageDataUrl,
    width: Math.max(1, Number(snapshot.width) || 1),
    height: Math.max(1, Number(snapshot.height) || 1),
  };
}

/**
 * Resolve the visible silhouette source for THIS layer.
 *  - procedural          → procedural-vector ∩ current live mask
 *  - baked-live-mask     → baked-alpha ∩ current live mask
 *  - baked-baked-mask    → baked-alpha (mask already in pixels) +
 *                          additional live mask if present
 */
export function resolveSilhouetteSource(element: unknown): SilhouetteSource {
  if (!element || typeof element !== 'object') {
    return { kind: 'procedural-vector', elementId: '', liveMaskKey: null };
  }
  const el = element as AnyRecord;
  const mode = resolveRenderSourceMode(el);
  const elementId = readElementId(el);
  const liveMask = readLiveMask(el);
  const maskKey = readMaskKey(liveMask);

  if (mode === 'procedural') {
    return { kind: 'procedural-vector', elementId, liveMaskKey: maskKey };
  }

  const snapshot = readSnapshot(readRenderState(el));
  if (!snapshot || typeof snapshot.imageDataUrl !== 'string' || snapshot.imageDataUrl.length === 0) {
    // Baked mode declared but snapshot pixels missing — degrade to procedural
    // silhouette. No historical-geometry fallback.
    return { kind: 'procedural-vector', elementId, liveMaskKey: maskKey };
  }

  if (mode === 'baked-live-mask') {
    return {
      kind: 'baked-alpha',
      imageDataUrl: snapshot.imageDataUrl,
      width: Math.max(1, Number(snapshot.width) || 1),
      height: Math.max(1, Number(snapshot.height) || 1),
      additionalLiveMaskKey: maskKey,
    };
  }

  // baked-baked-mask: mask already embedded in baked alpha; any live mask on
  // top is "additional".
  return {
    kind: 'baked-alpha',
    imageDataUrl: snapshot.imageDataUrl,
    width: Math.max(1, Number(snapshot.width) || 1),
    height: Math.max(1, Number(snapshot.height) || 1),
    additionalLiveMaskKey: maskKey,
  };
}
