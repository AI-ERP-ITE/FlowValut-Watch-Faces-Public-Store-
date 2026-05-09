export const RENDER_HASH_VERSION = 'rh1';

const NON_VISUAL_KEYS = new Set([
  'id',
  'name',
  'selected',
  'isSelected',
  'hovered',
  'isHovered',
  'focused',
  'isFocused',
  'ui',
  'uiState',
  'editorState',
  'inspectorState',
  'history',
  'historyState',
  'category',
  'libraryId',
  'sourceId',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'debug',
  'debugInfo',
  'viewport',
  'viewState',
  'canvasState',
  'selectionState',
]);

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `h${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function normalizeNumber(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(6));
}

function normalizeRenderStateForHash(value: unknown): Record<string, unknown> {
  const state = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const snapshot = state.snapshot && typeof state.snapshot === 'object'
    ? state.snapshot as Record<string, unknown>
    : {};

  const out: Record<string, unknown> = {};
  if (typeof state.sourceMode === 'string') out.sourceMode = state.sourceMode;
  if (typeof state.snapshotRenderMode === 'string') out.snapshotRenderMode = state.snapshotRenderMode;
  if (typeof state.sourceHash === 'string' && state.sourceHash.trim().length > 0) {
    out.sourceHash = state.sourceHash.trim();
  }
  if (typeof snapshot.sourceHash === 'string' && snapshot.sourceHash.trim().length > 0) {
    out.snapshotSourceHash = snapshot.sourceHash.trim();
  }

  return out;
}

function normalizeForStableHash(value: unknown, path: string[] = []): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForStableHash(item, path));
  }

  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const keys = Object.keys(source).sort((a, b) => a.localeCompare(b));

    for (const key of keys) {
      if (NON_VISUAL_KEYS.has(key)) continue;

      if (path.length === 0 && key === 'renderState') {
        const normalizedRenderState = normalizeRenderStateForHash(source[key]);
        if (Object.keys(normalizedRenderState).length > 0) {
          out.renderState = normalizedRenderState;
        }
        continue;
      }

      // Prevent heavy snapshot payloads from entering hash while renderState
      // keeps source hash linkage for snapshot-based visuals.
      if (key === 'snapshot') continue;

      const nextValue = normalizeForStableHash(source[key], [...path, key]);
      if (nextValue !== undefined) {
        out[key] = nextValue;
      }
    }

    return out;
  }

  if (typeof value === 'number') {
    return normalizeNumber(value);
  }

  if (typeof value === 'boolean' || typeof value === 'string' || value === null) {
    return value;
  }

  return undefined;
}

export function buildElementRenderHashPayload(element: Record<string, unknown>): Record<string, unknown> {
  const normalized = normalizeForStableHash(element);
  if (!normalized || typeof normalized !== 'object' || Array.isArray(normalized)) {
    return {};
  }
  return normalized as Record<string, unknown>;
}

export function generateElementRenderHash(element: Record<string, unknown>): string {
  const payload = buildElementRenderHashPayload(element);
  const serialized = JSON.stringify(payload);
  return `${RENDER_HASH_VERSION}:${fnv1a32(serialized)}`;
}
