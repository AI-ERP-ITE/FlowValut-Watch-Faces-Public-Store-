import type { ElementSnapshotCaptureResult } from './snapshotRenderer';
import { generateElementRenderHash } from './snapshotHash';

type TemplateElement = Record<string, unknown>;

export type SnapshotRenderSourceMode = 'live' | 'snapshot';
export type SnapshotFreshness = 'missing' | 'fresh' | 'outdated';

export type SnapshotState = {
  sourceMode: SnapshotRenderSourceMode;
  sourceHash?: string;
  snapshotStatus: SnapshotFreshness;
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
  const snapshotRaw = safe.snapshot;
  const snapshot = snapshotRaw && typeof snapshotRaw === 'object'
    ? deepClone(snapshotRaw as ElementSnapshotCaptureResult)
    : null;

  return {
    sourceMode,
    sourceHash,
    snapshotStatus,
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
  const next: TemplateElement = {
    ...element,
    renderState: {
      ...state,
      sourceMode: mode,
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
      snapshotStatus: 'fresh',
      snapshot: nextSnapshot,
    },
  };
  return next;
}

export function deleteElementSnapshot(element: TemplateElement): TemplateElement {
  const state = getElementRenderState(element);
  const next: TemplateElement = {
    ...element,
    renderState: {
      ...state,
      sourceMode: 'live',
      snapshotStatus: 'missing',
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
