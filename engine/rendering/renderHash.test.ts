import { describe, expect, it } from 'vitest';
import { generateElementRenderHash, RENDER_HASH_VERSION } from './renderHash';

describe('renderHash', () => {
  it('keeps hash stable for non-visual editor and viewport state changes', () => {
    const base = {
      type: 'free_rect',
      role: 'shape',
      visible: true,
      opacity: 0.8,
      params: { width: 0.4, height: 0.2, fill: '#cccccc' },
      placement: { mode: 'center', config: { offset: [5, 7], rotation: 15 } },
      selected: true,
      uiState: { panel: 'effects' },
      viewport: { zoom: 2, panX: 10, panY: 20 },
    } as Record<string, unknown>;

    const changed = {
      ...base,
      selected: false,
      uiState: { panel: 'mask' },
      viewport: { zoom: 3, panX: 100, panY: -20 },
      selectionState: { active: true },
    } as Record<string, unknown>;

    const h1 = generateElementRenderHash(base);
    const h2 = generateElementRenderHash(changed);

    expect(h1).toBe(h2);
    expect(h1.startsWith(`${RENDER_HASH_VERSION}:`)).toBe(true);
  });

  it('changes hash when visual geometry or transform changes', () => {
    const a = {
      type: 'ring',
      visible: true,
      opacity: 1,
      params: { radius: 0.4, thickness: 0.03 },
      placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
    } as Record<string, unknown>;

    const b = {
      ...a,
      placement: { mode: 'center', config: { offset: [10, 0], rotation: 0 } },
    } as Record<string, unknown>;

    expect(generateElementRenderHash(a)).not.toBe(generateElementRenderHash(b));
  });

  it('changes hash when mask/effects/texture/overlay settings change', () => {
    const base = {
      type: 'free_rect',
      visible: true,
      mask: {
        enabled: true,
        coordinateSpace: 'local',
        strokes: [{ tool: 'selection', shape: 'rect', action: 'hide', x: 10, y: 10, width: 30, height: 20 }],
      },
      effect3d: { enabled: true, intensity: 0.4 },
      texture: { enabled: true, kind: 'noise', opacity: 0.4 },
      gradient: { enabled: true, kind: 'linear', opacity: 0.2 },
    } as Record<string, unknown>;

    const changed = {
      ...base,
      texture: { enabled: true, kind: 'noise', opacity: 0.7 },
    } as Record<string, unknown>;

    expect(generateElementRenderHash(base)).not.toBe(generateElementRenderHash(changed));
  });

  it('includes snapshot source hash from renderState in hash decisions', () => {
    const a = {
      type: 'ring',
      visible: true,
      renderState: {
        sourceMode: 'snapshot',
        snapshotRenderMode: 'editable',
        snapshot: {
          sourceHash: 'v1:source-a',
          imageDataUrl: 'data:image/png;base64,AAAA',
        },
      },
    } as Record<string, unknown>;

    const b = {
      ...a,
      renderState: {
        sourceMode: 'snapshot',
        snapshotRenderMode: 'editable',
        snapshot: {
          sourceHash: 'v1:source-b',
          imageDataUrl: 'data:image/png;base64,BBBB',
        },
      },
    } as Record<string, unknown>;

    expect(generateElementRenderHash(a)).not.toBe(generateElementRenderHash(b));
  });

  it('is deterministic regardless of object key order', () => {
    const a = {
      type: 'free_rect',
      params: { width: 0.5, height: 0.4, fill: '#ffffff' },
      textureLayers: [{ enabled: true, opacity: 0.2, blendMode: 'overlay' }],
      renderState: { sourceMode: 'live', sourceHash: 'v1:hash' },
    } as Record<string, unknown>;

    const b = {
      renderState: { sourceHash: 'v1:hash', sourceMode: 'live' },
      textureLayers: [{ blendMode: 'overlay', opacity: 0.2, enabled: true }],
      params: { fill: '#ffffff', height: 0.4, width: 0.5 },
      type: 'free_rect',
    } as Record<string, unknown>;

    expect(generateElementRenderHash(a)).toBe(generateElementRenderHash(b));
  });
});
