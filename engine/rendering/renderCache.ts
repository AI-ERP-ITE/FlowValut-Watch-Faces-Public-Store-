export type CachedRenderEntry = {
  hash: string;
  renderedOutput: string;
  createdAt: number;
};

const renderCacheByElementId = new Map<string, CachedRenderEntry>();

function normalizeElementId(elementId: string): string {
  return typeof elementId === 'string' ? elementId.trim() : '';
}

function cloneEntry(entry: CachedRenderEntry): CachedRenderEntry {
  return {
    hash: entry.hash,
    renderedOutput: entry.renderedOutput,
    createdAt: entry.createdAt,
  };
}

export function getCachedRender(elementId: string): CachedRenderEntry | undefined {
  const key = normalizeElementId(elementId);
  if (!key) return undefined;
  const found = renderCacheByElementId.get(key);
  return found ? cloneEntry(found) : undefined;
}

export function setCachedRender(elementId: string, entry: CachedRenderEntry): void {
  const key = normalizeElementId(elementId);
  if (!key) return;

  const safeHash = typeof entry?.hash === 'string' ? entry.hash : '';
  const safeRenderedOutput = typeof entry?.renderedOutput === 'string' ? entry.renderedOutput : '';
  const safeCreatedAt = Number.isFinite(Number(entry?.createdAt))
    ? Number(entry.createdAt)
    : Date.now();

  renderCacheByElementId.set(key, {
    hash: safeHash,
    renderedOutput: safeRenderedOutput,
    createdAt: safeCreatedAt,
  });
}

export function invalidateCachedRender(elementId: string): void {
  const key = normalizeElementId(elementId);
  if (!key) return;
  renderCacheByElementId.delete(key);
}

export function removeCachedRender(elementId: string): void {
  invalidateCachedRender(elementId);
}

export function clearCachedRenderAll(): void {
  renderCacheByElementId.clear();
}

export function getCachedRenderSize(): number {
  return renderCacheByElementId.size;
}

export function getCachedRenderElementIds(): string[] {
  return Array.from(renderCacheByElementId.keys());
}
