import type { ElementSnapshotCaptureResult } from './snapshotRenderer';
import { generateElementRenderHash } from './snapshotHash';
import type { RenderSourceMode } from '../../src/types/renderSourceMode';
import { isRenderSourceMode } from '../../src/types/renderSourceMode';

type TemplateElement = Record<string, unknown>;

export type SnapshotRenderSourceMode = 'live' | 'snapshot';
export type SnapshotRenderMode = 'frozen' | 'editable';
export type SnapshotFreshness = 'missing' | 'fresh' | 'outdated';

export type SnapshotState = {
  sourceMode: SnapshotRenderSourceMode;
  snapshotRenderMode: SnapshotRenderMode;
  sourceHash?: string;
  snapshotRevisionHash?: string;
  snapshotStatus: SnapshotFreshness;
  lastSnapshotFrame?: {
    width: number;
    height: number;
  } | null;
  snapshot: ElementSnapshotCaptureResult | null;
  /**
   * Canonical render-source mode (Phase 1 contract). When the legacy element
   * lacks this field, it is inferred ONCE from snapshot + mask presence and
   * stamped here; subsequent reads return the explicit value verbatim.
   */
  renderSourceMode: RenderSourceMode;
  /**
   * Whether the live mask was embedded into the baked snapshot at capture
   * time. Only meaningful when a snapshot exists.
   */
  maskEmbeddedInSnapshot: boolean;
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeRenderState(source: unknown, parent?: TemplateElement): SnapshotState {
  const safe = source && typeof source === 'object' ? source as Record<string, unknown> : {};
  const sourceMode = safe.sourceMode === 'snapshot' ? 'snapshot' : 'live';
  const snapshotRenderMode: SnapshotRenderMode = safe.snapshotRenderMode === 'editable' ? 'editable' : 'frozen';
  const snapshotStatusRaw = safe.snapshotStatus;
  const snapshotStatus: SnapshotFreshness =
    snapshotStatusRaw === 'fresh' || snapshotStatusRaw === 'outdated' || snapshotStatusRaw === 'missing'
      ? snapshotStatusRaw
      : 'missing';
  const sourceHash = typeof safe.sourceHash === 'string' ? safe.sourceHash : undefined;
  const snapshotRevisionHash = typeof safe.snapshotRevisionHash === 'string' ? safe.snapshotRevisionHash : undefined;
  const lastSnapshotFrameRaw = safe.lastSnapshotFrame;
  const lastSnapshotFrame = lastSnapshotFrameRaw && typeof lastSnapshotFrameRaw === 'object'
    ? {
        width: Number((lastSnapshotFrameRaw as Record<string, unknown>).width),
        height: Number((lastSnapshotFrameRaw as Record<string, unknown>).height),
      }
    : null;
  const normalizedLastSnapshotFrame = lastSnapshotFrame
    && Number.isFinite(lastSnapshotFrame.width)
    && lastSnapshotFrame.width > 0
    && Number.isFinite(lastSnapshotFrame.height)
    && lastSnapshotFrame.height > 0
      ? { width: Math.max(1, lastSnapshotFrame.width), height: Math.max(1, lastSnapshotFrame.height) }
      : null;
  const snapshotRaw = safe.snapshot;
  const snapshot = snapshotRaw && typeof snapshotRaw === 'object'
    ? deepClone(snapshotRaw as ElementSnapshotCaptureResult)
    : null;

  let renderSourceMode: RenderSourceMode;
  if (isRenderSourceMode(safe.renderSourceMode)) {
    renderSourceMode = safe.renderSourceMode;
  } else {
    const hasSnapshotPixels = !!(snapshot && typeof (snapshot as Record<string, unknown>).imageDataUrl === 'string'
      && ((snapshot as Record<string, unknown>).imageDataUrl as string).length > 0);
    const parentMask = parent && typeof parent === 'object' ? (parent as Record<string, unknown>).mask : undefined;
    const hasLiveMask = !!parentMask
      && typeof parentMask === 'object'
      && (parentMask as Record<string, unknown>).enabled !== false;
    if (!hasSnapshotPixels) renderSourceMode = 'procedural';
    else if (hasLiveMask) renderSourceMode = 'baked-live-mask';
    else renderSourceMode = 'baked-baked-mask';
  }
  const maskEmbeddedInSnapshot = typeof safe.maskEmbeddedInSnapshot === 'boolean'
    ? safe.maskEmbeddedInSnapshot
    : renderSourceMode === 'baked-baked-mask';

  return {
    sourceMode,
    snapshotRenderMode,
    sourceHash,
    snapshotRevisionHash,
    snapshotStatus,
    lastSnapshotFrame: normalizedLastSnapshotFrame,
    snapshot,
    renderSourceMode,
    maskEmbeddedInSnapshot,
  };
}

export function getElementRenderState(element: TemplateElement): SnapshotState {
  return normalizeRenderState(element.renderState, element);
}

export function getElementSnapshot(element: TemplateElement): ElementSnapshotCaptureResult | null {
  return getElementRenderState(element).snapshot;
}

export function setElementRenderSourceMode(element: TemplateElement, mode: SnapshotRenderSourceMode): TemplateElement {
  const state = getElementRenderState(element);
  const snapshotStatus = mode === 'snapshot'
    ? resolveElementSnapshotStatus(element)
    : state.snapshotStatus;
  const next: TemplateElement = {
    ...element,
    renderState: {
      ...state,
      sourceMode: mode,
      snapshotStatus,
    },
  };
  return next;
}

export function setElementSnapshot(
  element: TemplateElement,
  snapshot: ElementSnapshotCaptureResult,
  options?: { maskEmbeddedInSnapshot?: boolean },
): TemplateElement {
  const state = getElementRenderState(element);
  const nextSnapshot = deepClone(snapshot);
  const parentMask = (element as Record<string, unknown>).mask;
  const hasLiveMask = !!parentMask
    && typeof parentMask === 'object'
    && (parentMask as Record<string, unknown>).enabled !== false;
  const maskEmbeddedInSnapshot = typeof options?.maskEmbeddedInSnapshot === 'boolean'
    ? options.maskEmbeddedInSnapshot
    : !hasLiveMask;
  const renderSourceMode: RenderSourceMode = maskEmbeddedInSnapshot
    ? 'baked-baked-mask'
    : 'baked-live-mask';
  const next: TemplateElement = {
    ...element,
    renderState: {
      ...state,
      sourceMode: 'snapshot',
      snapshotRenderMode: state.snapshotRenderMode,
      sourceHash: nextSnapshot.sourceHash,
      snapshotRevisionHash: typeof nextSnapshot.snapshotRevisionHash === 'string'
        ? nextSnapshot.snapshotRevisionHash
        : state.snapshotRevisionHash,
      snapshotStatus: 'fresh',
      lastSnapshotFrame: {
        width: Math.max(1, Number(nextSnapshot.width) || 1),
        height: Math.max(1, Number(nextSnapshot.height) || 1),
      },
      snapshot: nextSnapshot,
      renderSourceMode,
      maskEmbeddedInSnapshot,
    },
  };
  return next;
}

export function deleteElementSnapshot(element: TemplateElement): TemplateElement {
  const state = getElementRenderState(element);
  const liveHash = generateElementRenderHash(element);
  const snapshotFrame = state.snapshot && typeof state.snapshot === 'object'
    ? {
        width: Math.max(1, Number(state.snapshot.width) || 1),
        height: Math.max(1, Number(state.snapshot.height) || 1),
      }
    : state.lastSnapshotFrame ?? null;
  const next: TemplateElement = {
    ...element,
    renderState: {
      ...state,
      sourceMode: 'live',
      sourceHash: liveHash,
      snapshotRevisionHash: undefined,
      snapshotStatus: 'missing',
      lastSnapshotFrame: snapshotFrame,
      snapshot: null,
      renderSourceMode: 'procedural',
      maskEmbeddedInSnapshot: false,
    },
  };
  return next;
}

export function resolveElementSnapshotStatus(
  element: TemplateElement,
  liveHashOverride?: string,
): SnapshotFreshness {
  const state = getElementRenderState(element);
  const snapshot = state.snapshot;
  if (!snapshot || typeof snapshot !== 'object') return 'missing';
  if (typeof snapshot.imageDataUrl !== 'string' || snapshot.imageDataUrl.trim().length === 0) return 'missing';

  const expectedRevisionHash = typeof state.snapshotRevisionHash === 'string'
    ? state.snapshotRevisionHash.trim()
    : '';
  const actualRevisionHash = typeof snapshot.snapshotRevisionHash === 'string'
    ? snapshot.snapshotRevisionHash.trim()
    : '';
  if (state.sourceMode === 'snapshot' && expectedRevisionHash && actualRevisionHash && expectedRevisionHash === actualRevisionHash) {
    return 'fresh';
  }

  const storedHash = typeof snapshot.sourceHash === 'string' && snapshot.sourceHash.trim().length > 0
    ? snapshot.sourceHash
    : (typeof state.sourceHash === 'string' ? state.sourceHash : '');
  if (!storedHash) return 'outdated';

  const liveHash = typeof liveHashOverride === 'string' && liveHashOverride.trim().length > 0
    ? liveHashOverride
    : generateElementRenderHash(element);

  return liveHash === storedHash ? 'fresh' : 'outdated';
}

export function refreshElementSnapshotStatus(
  element: TemplateElement,
  liveHashOverride?: string,
): TemplateElement {
  const state = getElementRenderState(element);
  const liveHash = typeof liveHashOverride === 'string' && liveHashOverride.trim().length > 0
    ? liveHashOverride
    : generateElementRenderHash(element);
  const snapshotStatus = resolveElementSnapshotStatus(element, liveHash);
  const next: TemplateElement = {
    ...element,
    renderState: {
      ...state,
      sourceHash: liveHash,
      snapshotRevisionHash: state.snapshot && typeof state.snapshot === 'object' && typeof state.snapshot.snapshotRevisionHash === 'string'
        ? state.snapshot.snapshotRevisionHash
        : state.snapshotRevisionHash,
      snapshotStatus,
    },
  };
  return next;
}

export function updateElementById(
  elements: TemplateElement[],
  elementId: string,
  updater: (element: TemplateElement) => TemplateElement,
): TemplateElement[] {
  if (!Array.isArray(elements)) return [];
  return elements.map((entry) => {
    const id = typeof entry?.id === 'string' ? entry.id : '';
    if (id !== elementId) return entry;
    return updater(entry);
  });
}
