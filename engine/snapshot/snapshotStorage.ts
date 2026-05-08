import type { ElementSnapshotCaptureResult } from './snapshotRenderer';
import { generateElementRenderHash } from './snapshotHash';

type TemplateElement = Record<string, unknown>;

export type SnapshotRenderSourceMode = 'live' | 'snapshot';
export type SnapshotFreshness = 'missing' | 'fresh' | 'outdated';

export type SnapshotState = {
  sourceMode: SnapshotRenderSourceMode;
  sourceHash?: string;
  snapshotRevisionHash?: string;
  snapshotStatus: SnapshotFreshness;
  lastSnapshotFrame?: {
    width: number;
    height: number;
  } | null;
  snapshot: ElementSnapshotCaptureResult | null;
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeRenderState(source: unknown): SnapshotState {
  const safe = source && typeof source === 'object' ? source as Record<string, unknown> : {};
  const sourceMode = safe.sourceMode === 'snapshot' ? 'snapshot' : 'live';
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

  return {
    sourceMode,
    sourceHash,
    snapshotRevisionHash,
    snapshotStatus,
    lastSnapshotFrame: normalizedLastSnapshotFrame,
    snapshot,
  };
}

export function getElementRenderState(element: TemplateElement): SnapshotState {
  return normalizeRenderState(element.renderState);
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

export function setElementSnapshot(element: TemplateElement, snapshot: ElementSnapshotCaptureResult): TemplateElement {
  const state = getElementRenderState(element);
  const nextSnapshot = deepClone(snapshot);
  const next: TemplateElement = {
    ...element,
    renderState: {
      ...state,
      sourceMode: 'snapshot',
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
