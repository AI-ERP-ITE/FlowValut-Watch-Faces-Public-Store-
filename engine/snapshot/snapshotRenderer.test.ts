import { describe, expect, it } from 'vitest';
import { __snapshotRendererInternalsForTest } from './snapshotRenderer';

describe('snapshotRenderer sanitizeElementForEngine', () => {
  it('drops element mask so snapshot capture does not bake mask alpha twice', () => {
    const source = {
      id: 'el-1',
      visible: true,
      type: 'free_rect',
      params: { width: 0.4, height: 0.2, fill: '#999' },
      mask: {
        enabled: true,
        coordinateSpace: 'local',
        strokes: [
          { tool: 'selection', shape: 'rect', action: 'hide', opacity: 1, x: 10, y: 10, width: 40, height: 40 },
        ],
      },
      renderState: {
        sourceMode: 'snapshot',
        snapshotStatus: 'fresh',
      },
    } as Record<string, unknown>;

    const sanitized = __snapshotRendererInternalsForTest.sanitizeElementForEngine(source);

    expect(Object.prototype.hasOwnProperty.call(sanitized, 'mask')).toBe(false);
    expect((sanitized.renderState as Record<string, unknown>).sourceMode).toBe('live');
    expect((source.renderState as Record<string, unknown>).sourceMode).toBe('snapshot');
  });

  it('keeps element mask when bakeMaskIntoSnapshot mode is enabled', () => {
    const source = {
      id: 'el-2',
      visible: true,
      type: 'free_rect',
      params: { width: 0.5, height: 0.3, fill: '#abc' },
      mask: {
        enabled: true,
        coordinateSpace: 'local',
        strokes: [
          { tool: 'selection', shape: 'circle', action: 'hide', opacity: 1, x: 24, y: 20, radius: 16 },
        ],
      },
      renderState: {
        sourceMode: 'snapshot',
        snapshotStatus: 'fresh',
      },
    } as Record<string, unknown>;

    const sanitized = __snapshotRendererInternalsForTest.sanitizeElementForEngine(source, {
      bakeMaskIntoSnapshot: true,
    });

    expect(Object.prototype.hasOwnProperty.call(sanitized, 'mask')).toBe(true);
    expect((sanitized.renderState as Record<string, unknown>).sourceMode).toBe('live');
  });
  it('preserves snapshot source mode when preserveRenderSourceMode is enabled', () => {
    const source = {
      id: 'el-3',
      visible: true,
      type: 'free_rect',
      params: { width: 0.5, height: 0.3, fill: '#abc' },
      renderState: {
        sourceMode: 'snapshot',
        snapshotStatus: 'fresh',
      },
    } as Record<string, unknown>;

    const sanitized = __snapshotRendererInternalsForTest.sanitizeElementForEngine(source, {
      preserveRenderSourceMode: true,
    });

    expect((sanitized.renderState as Record<string, unknown>).sourceMode).toBe('snapshot');
  });
});

describe('snapshotRenderer resolveSnapshotPixelRatio', () => {
  it('caps DPR to 2x', () => {
    const originalWindow = (globalThis as { window?: { devicePixelRatio?: number } }).window;
    (globalThis as { window?: { devicePixelRatio?: number } }).window = { devicePixelRatio: 3 };
    try {
      expect(__snapshotRendererInternalsForTest.resolveSnapshotPixelRatio()).toBe(2);
    } finally {
      (globalThis as { window?: { devicePixelRatio?: number } }).window = originalWindow;
    }
  });

  it('falls back to 1x for invalid DPR', () => {
    const originalWindow = (globalThis as { window?: { devicePixelRatio?: number } }).window;
    (globalThis as { window?: { devicePixelRatio?: number } }).window = { devicePixelRatio: 0 };
    try {
      expect(__snapshotRendererInternalsForTest.resolveSnapshotPixelRatio()).toBe(1);
    } finally {
      (globalThis as { window?: { devicePixelRatio?: number } }).window = originalWindow;
    }
  });
});

