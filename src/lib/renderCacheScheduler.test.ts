import { describe, expect, it, vi } from 'vitest';
import type { CachedRenderEntry } from '../../engine/rendering/renderCache';
import { resolveLayerRenderOutput, resolveLayerRenderOutputWithInvalidation } from './renderCacheScheduler';

describe('renderCacheScheduler', () => {
  const stripNamespace = (value: string) => {
    const sep = value.indexOf(':');
    if (sep < 0) return value;
    return value.slice(sep + 1);
  };

  it('reuses cached output on hash hit and does not rerender', () => {
    const cache = new Map<string, CachedRenderEntry>();
    cache.set('el-1', {
      hash: 'rh1:h1',
      renderedOutput: '<g id="cached" />',
      createdAt: 1,
    });

    const renderLayerSvg = vi.fn(() => '<g id="fresh" />');
    const debugLogger = vi.fn();

    const output = resolveLayerRenderOutput({
      cacheKey: 'el-1',
      nextHash: 'rh1:h1',
      passSeed: 'layer-0',
      getCachedRender: (id) => cache.get(id),
      setCachedRender: (id, entry) => cache.set(id, entry),
      renderLayerSvg,
      namespaceSvgIds: (svg, ns) => `${ns}:${svg}`,
      debugLogger,
    });

    expect(renderLayerSvg).not.toHaveBeenCalled();
    expect(debugLogger).toHaveBeenCalledWith('[RenderCache]', 'el-1', 'HIT');
    expect(output).toBe('layer-0:<g id="cached" />');
  });

  it('rerenders once on hash miss and updates cache entry', () => {
    const cache = new Map<string, CachedRenderEntry>();
    cache.set('el-1', {
      hash: 'rh1:old',
      renderedOutput: '<g id="old" />',
      createdAt: 1,
    });

    const renderLayerSvg = vi.fn(() => '<g id="fresh" />');
    const debugLogger = vi.fn();

    const output = resolveLayerRenderOutput({
      cacheKey: 'el-1',
      nextHash: 'rh1:new',
      passSeed: 'layer-1',
      getCachedRender: (id) => cache.get(id),
      setCachedRender: (id, entry) => cache.set(id, entry),
      renderLayerSvg,
      namespaceSvgIds: (svg, ns) => `${ns}:${svg}`,
      now: () => 123,
      debugLogger,
    });

    expect(renderLayerSvg).toHaveBeenCalledTimes(1);
    expect(debugLogger).toHaveBeenCalledWith('[RenderCache]', 'el-1', 'MISS');
    expect(cache.get('el-1')).toEqual({
      hash: 'rh1:new',
      renderedOutput: '<g id="fresh" />',
      createdAt: 123,
    });
    expect(output).toBe('layer-1:<g id="fresh" />');
  });

  it('rerender-once then hit on unchanged subsequent hash', () => {
    const cache = new Map<string, CachedRenderEntry>();
    const renderLayerSvg = vi.fn(() => '<g id="frame" />');

    const first = resolveLayerRenderOutput({
      cacheKey: 'el-2',
      nextHash: 'rh1:same',
      passSeed: 'layer-a',
      getCachedRender: (id) => cache.get(id),
      setCachedRender: (id, entry) => cache.set(id, entry),
      renderLayerSvg,
      namespaceSvgIds: (svg, ns) => `${ns}:${svg}`,
      now: () => 88,
      debugLogger: () => undefined,
    });

    const second = resolveLayerRenderOutput({
      cacheKey: 'el-2',
      nextHash: 'rh1:same',
      passSeed: 'layer-b',
      getCachedRender: (id) => cache.get(id),
      setCachedRender: (id, entry) => cache.set(id, entry),
      renderLayerSvg,
      namespaceSvgIds: (svg, ns) => `${ns}:${svg}`,
      now: () => 99,
      debugLogger: () => undefined,
    });

    expect(renderLayerSvg).toHaveBeenCalledTimes(1);
    expect(first).toBe('layer-a:<g id="frame" />');
    expect(second).toBe('layer-b:<g id="frame" />');
  });

  it('freezes clean sibling layers when a dirty set is active', () => {
    const cache = new Map<string, CachedRenderEntry>();
    cache.set('el-sibling', {
      hash: 'rh1:older',
      renderedOutput: '<g id="sibling-cached" />',
      createdAt: 10,
    });

    const renderLayerSvg = vi.fn(() => '<g id="sibling-fresh" />');
    const invalidationDebugLogger = vi.fn();
    const cacheDebugLogger = vi.fn();

    const output = resolveLayerRenderOutputWithInvalidation({
      cacheKey: 'el-sibling',
      nextHash: 'rh1:newer',
      passSeed: 'layer-sibling',
      getCachedRender: (id) => cache.get(id),
      setCachedRender: (id, entry) => cache.set(id, entry),
      renderLayerSvg,
      namespaceSvgIds: (svg, ns) => `${ns}:${svg}`,
      dirtyElementIds: ['el-target'],
      dirtyReasonByElementId: new Map([['el-target', 'mask']]),
      invalidationDebugLogger,
      debugLogger: cacheDebugLogger,
    });

    expect(renderLayerSvg).not.toHaveBeenCalled();
    expect(invalidationDebugLogger).toHaveBeenCalledWith('[RenderInvalidation]', 'el-sibling', 'FROZEN');
    expect(cacheDebugLogger).not.toHaveBeenCalled();
    expect(output).toBe('layer-sibling:<g id="sibling-cached" />');
  });

  it('rerenders dirty mask target while sibling can stay frozen', () => {
    const cache = new Map<string, CachedRenderEntry>();
    cache.set('el-mask', {
      hash: 'rh1:old-mask',
      renderedOutput: '<g id="mask-old" />',
      createdAt: 3,
    });

    const renderLayerSvg = vi.fn(() => '<g id="mask-new" />');
    const invalidationDebugLogger = vi.fn();
    const cacheDebugLogger = vi.fn();

    const output = resolveLayerRenderOutputWithInvalidation({
      cacheKey: 'el-mask',
      nextHash: 'rh1:new-mask',
      passSeed: 'layer-mask',
      getCachedRender: (id) => cache.get(id),
      setCachedRender: (id, entry) => cache.set(id, entry),
      renderLayerSvg,
      namespaceSvgIds: (svg, ns) => `${ns}:${svg}`,
      dirtyElementIds: ['el-mask'],
      dirtyReasonByElementId: new Map([['el-mask', 'mask']]),
      invalidationDebugLogger,
      debugLogger: cacheDebugLogger,
      now: () => 444,
    });

    expect(invalidationDebugLogger).toHaveBeenCalledWith('[RenderInvalidation]', 'el-mask', 'DIRTY', 'mask');
    expect(renderLayerSvg).toHaveBeenCalledTimes(1);
    expect(cacheDebugLogger).toHaveBeenCalledWith('[RenderCache]', 'el-mask', 'MISS');
    expect(cache.get('el-mask')).toEqual({
      hash: 'rh1:new-mask',
      renderedOutput: '<g id="mask-new" />',
      createdAt: 444,
    });
    expect(output).toBe('layer-mask:<g id="mask-new" />');
  });

  it('large-scene editing rerenders only dirty layers and preserves final-frame parity', () => {
    const layerIds = Array.from({ length: 24 }, (_, index) => `el-${String(index + 1).padStart(2, '0')}`);
    const cache = new Map<string, CachedRenderEntry>();

    for (const [index, layerId] of layerIds.entries()) {
      cache.set(layerId, {
        hash: `h:${layerId}:base`,
        renderedOutput: `<g id="${layerId}-base-${index}" />`,
        createdAt: 1,
      });
    }

    const runSceneFrame = (options: {
      dirtyIds: string[];
      dirtyReasons: ReadonlyMap<string, string>;
      changedHashes: ReadonlyMap<string, string>;
      passSeed: string;
    }) => {
      const invalidationDebugLogger = vi.fn();
      const cacheDebugLogger = vi.fn();
      let rerenderCount = 0;

      const outputs = layerIds.map((layerId, index) => {
        const nextHash = options.changedHashes.get(layerId) ?? `h:${layerId}:base`;
        return resolveLayerRenderOutputWithInvalidation({
          cacheKey: layerId,
          nextHash,
          passSeed: `${options.passSeed}-l${index}`,
          getCachedRender: (id) => cache.get(id),
          setCachedRender: (id, entry) => cache.set(id, entry),
          renderLayerSvg: () => {
            rerenderCount += 1;
            return `<g id="${layerId}-fresh-${options.passSeed}" />`;
          },
          namespaceSvgIds: (svg, ns) => `${ns}:${svg}`,
          dirtyElementIds: options.dirtyIds,
          dirtyReasonByElementId: options.dirtyReasons,
          invalidationDebugLogger,
          debugLogger: cacheDebugLogger,
          now: () => 100,
        });
      });

      return { outputs, rerenderCount, invalidationDebugLogger, cacheDebugLogger };
    };

    const dirtyIds = ['el-08', 'el-17']; // drag transform + brush mask edits
    const dirtyReasons = new Map<string, string>([
      ['el-08', 'transform'],
      ['el-17', 'mask'],
    ]);
    const changedHashes = new Map<string, string>([
      ['el-08', 'h:el-08:dragged'],
      ['el-17', 'h:el-17:brushed'],
    ]);

    const editingFrame = runSceneFrame({
      dirtyIds,
      dirtyReasons,
      changedHashes,
      passSeed: 'editing',
    });

    const frozenCount = editingFrame.invalidationDebugLogger.mock.calls.filter((call) => call[2] === 'FROZEN').length;
    const dirtyCount = editingFrame.invalidationDebugLogger.mock.calls.filter((call) => call[2] === 'DIRTY').length;
    const baselineRerenderCount = layerIds.length;
    const estimatedCostMsOptimized = editingFrame.rerenderCount * 4;
    const estimatedCostMsBaseline = baselineRerenderCount * 4;

    expect(editingFrame.rerenderCount).toBe(2);
    expect(dirtyCount).toBe(2);
    expect(frozenCount).toBe(22);
    expect(estimatedCostMsOptimized).toBeLessThan(estimatedCostMsBaseline);

    const finalFrame = runSceneFrame({
      dirtyIds: [],
      dirtyReasons: new Map<string, string>(),
      changedHashes,
      passSeed: 'final',
    });

    expect(finalFrame.rerenderCount).toBe(0);
    const editingVisual = editingFrame.outputs.map(stripNamespace);
    const finalVisual = finalFrame.outputs.map(stripNamespace);
    expect(finalVisual).toEqual(editingVisual);
  });
});
