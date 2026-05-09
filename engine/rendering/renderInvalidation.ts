export type DirtyReason =
  | 'geometry'
  | 'mask'
  | 'effects'
  | 'transform'
  | 'snapshot';

const dirtyElements = new Set<string>();
const dirtyReasonsByElement = new Map<string, DirtyReason>();

function normalizeElementId(elementId: string): string {
  return typeof elementId === 'string' ? elementId.trim() : '';
}

export function markElementDirty(elementId: string, reason: DirtyReason): void {
  const key = normalizeElementId(elementId);
  if (!key) return;
  dirtyElements.add(key);
  dirtyReasonsByElement.set(key, reason);
}

export function markElementsDirty(elementIds: string[], reason: DirtyReason): void {
  if (!Array.isArray(elementIds)) return;
  for (const elementId of elementIds) {
    markElementDirty(elementId, reason);
  }
}

export function isElementDirty(elementId: string): boolean {
  const key = normalizeElementId(elementId);
  if (!key) return false;
  return dirtyElements.has(key);
}

export function getElementDirtyReason(elementId: string): DirtyReason | undefined {
  const key = normalizeElementId(elementId);
  if (!key) return undefined;
  return dirtyReasonsByElement.get(key);
}

export function consumeDirtyElementIds(): string[] {
  const ids = Array.from(dirtyElements.values());
  dirtyElements.clear();
  dirtyReasonsByElement.clear();
  return ids;
}

export function getDirtyElementIds(): string[] {
  return Array.from(dirtyElements.values());
}

export function resetRenderInvalidationState(): void {
  dirtyElements.clear();
  dirtyReasonsByElement.clear();
}
