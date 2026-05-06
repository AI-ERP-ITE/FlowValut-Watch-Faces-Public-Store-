import { describe, expect, it } from 'vitest';
import { generateElementRenderHash, SNAPSHOT_HASH_VERSION } from './snapshotHash';

describe('snapshotHash', () => {
  it('keeps hash stable for non-visual editor state changes', () => {
    const base = {
      type: 'base',
      role: 'base',
      visible: true,
      params: { width: 0.5, height: 0.3, fill: '#ffffff' },
      textureLayers: [
        { enabled: true, opacity: 0.2, blendMode: 'overlay' },
      ],
      selected: true,
      uiState: { panel: 'effects' },
      renderState: { sourceMode: 'live', snapshotStatus: 'missing' },
    } as Record<string, unknown>;

    const changedNonVisual = {
      ...base,
      selected: false,
      uiState: { panel: 'mask' },
      renderState: { sourceMode: 'snapshot', snapshotStatus: 'fresh', sourceHash: 'abc' },
    } as Record<string, unknown>;

    const h1 = generateElementRenderHash(base);
    const h2 = generateElementRenderHash(changedNonVisual);

    expect(h1).toBe(h2);
    expect(h1.startsWith(`${SNAPSHOT_HASH_VERSION}:`)).toBe(true);
  });

  it('changes hash when visual properties change', () => {
    const a = {
      type: 'free_rect',
      params: { width: 0.4, height: 0.2, fill: '#999999' },
      styleAdjust: { contrast: 0, highlight: 0 },
    } as Record<string, unknown>;

    const b = {
      ...a,
      params: { width: 0.6, height: 0.2, fill: '#999999' },
    } as Record<string, unknown>;

    const h1 = generateElementRenderHash(a);
    const h2 = generateElementRenderHash(b);

    expect(h1).not.toBe(h2);
  });

  it('is deterministic for object key order differences', () => {
    const a = {
      type: 'base',
      params: { fill: '#111111', width: 0.5, height: 0.5 },
      gradientLayers: [
        {
          enabled: true,
          kind: 'linear',
          stops: [
            { offset: 0, color: '#ffffff', opacity: 0.3 },
            { offset: 1, color: '#000000', opacity: 0.2 },
          ],
        },
      ],
    } as Record<string, unknown>;

    const b = {
      gradientLayers: [
        {
          stops: [
            { color: '#ffffff', opacity: 0.3, offset: 0 },
            { color: '#000000', opacity: 0.2, offset: 1 },
          ],
          kind: 'linear',
          enabled: true,
        },
      ],
      params: { height: 0.5, width: 0.5, fill: '#111111' },
      type: 'base',
    } as Record<string, unknown>;

    const h1 = generateElementRenderHash(a);
    const h2 = generateElementRenderHash(b);

    expect(h1).toBe(h2);
  });
});
