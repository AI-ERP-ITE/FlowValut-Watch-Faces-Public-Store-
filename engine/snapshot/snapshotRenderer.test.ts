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
});
