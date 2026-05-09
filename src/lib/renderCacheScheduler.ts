import type { CachedRenderEntry } from '../../engine/rendering/renderCache';

type DebugLogger = (scope: string, cacheKey: string, status: 'HIT' | 'MISS') => void;
type InvalidationDebugLogger = (scope: string, cacheKey: string, status: 'DIRTY' | 'FROZEN' | 'FROZEN_MISS', reason?: string) => void;

type ResolveLayerRenderOutputInput = {
  cacheKey: string;
  nextHash: string;
  passSeed: string;
  getCachedRender: (elementId: string) => CachedRenderEntry | undefined;
  setCachedRender: (elementId: string, entry: CachedRenderEntry) => void;
  renderLayerSvg: () => string;
  namespaceSvgIds: (svgMarkup: string, namespaceSeed: string) => string;
  now?: () => number;
  debugLogger?: DebugLogger;
};

type ResolveLayerRenderOutputWithInvalidationInput = ResolveLayerRenderOutputInput & {
  dirtyElementIds?: Iterable<string>;
  dirtyReasonByElementId?: ReadonlyMap<string, string>;
  invalidationDebugLogger?: InvalidationDebugLogger;
};

export function resolveLayerRenderOutput(input: ResolveLayerRenderOutputInput): string {
  const now = input.now ?? (() => Date.now());
  const debug = input.debugLogger ?? ((scope: string, cacheKey: string, status: 'HIT' | 'MISS') => {
    console.debug(scope, cacheKey, status);
  });

  const cached = input.getCachedRender(input.cacheKey);
  if (cached && cached.hash === input.nextHash) {
    debug('[RenderCache]', input.cacheKey, 'HIT');
    return input.namespaceSvgIds(cached.renderedOutput, input.passSeed);
  }

  debug('[RenderCache]', input.cacheKey, 'MISS');
  const renderedOutput = input.renderLayerSvg();
  input.setCachedRender(input.cacheKey, {
    hash: input.nextHash,
    renderedOutput,
    createdAt: now(),
  });

  return input.namespaceSvgIds(renderedOutput, input.passSeed);
}

export function resolveLayerRenderOutputWithInvalidation(input: ResolveLayerRenderOutputWithInvalidationInput): string {
  const dirtySet = new Set(Array.from(input.dirtyElementIds ?? []).map((id) => id.trim()).filter((id) => id.length > 0));
  const hasDirtySet = dirtySet.size > 0;
  const isDirty = hasDirtySet && dirtySet.has(input.cacheKey);
  const invalidationDebug = input.invalidationDebugLogger
    ?? ((scope: string, cacheKey: string, status: 'DIRTY' | 'FROZEN' | 'FROZEN_MISS', reason?: string) => {
      if (status === 'DIRTY' && typeof reason === 'string' && reason.length > 0) {
        console.debug(scope, cacheKey, `${status}:${reason}`);
        return;
      }
      console.debug(scope, cacheKey, status);
    });

  if (hasDirtySet && !isDirty) {
    const frozen = input.getCachedRender(input.cacheKey);
    if (frozen) {
      invalidationDebug('[RenderInvalidation]', input.cacheKey, 'FROZEN');
      return input.namespaceSvgIds(frozen.renderedOutput, input.passSeed);
    }
    invalidationDebug('[RenderInvalidation]', input.cacheKey, 'FROZEN_MISS');
  }

  if (hasDirtySet && isDirty) {
    const reason = input.dirtyReasonByElementId?.get(input.cacheKey) ?? 'unknown';
    invalidationDebug('[RenderInvalidation]', input.cacheKey, 'DIRTY', reason);
  }

  return resolveLayerRenderOutput(input);
}
