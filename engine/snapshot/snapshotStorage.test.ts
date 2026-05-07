import { describe, expect, it } from 'vitest';
import { generateElementRenderHash } from './snapshotHash';
import {
  refreshElementSnapshotStatus,
  resolveElementSnapshotStatus,
  setElementSnapshot,
} from './snapshotStorage';

describe('snapshotStorage stale detection', () => {
  it('returns missing when no snapshot exists', () => {
    const element = {
      id: 'el-1',
      type: 'base',
      params: { width: 0.5, fill: '#fff' },
      renderState: { sourceMode: 'live', snapshot: null },
    } as Record<string, unknown>;

    expect(resolveElementSnapshotStatus(element)).toBe('missing');
  });

  it('returns fresh when stored hash equals live hash', () => {
    const base = {
      id: 'el-2',
      type: 'free_rect',
      params: { width: 0.4, height: 0.2, fill: '#999' },
    } as Record<string, unknown>;
    const sourceHash = generateElementRenderHash(base);
    const withSnapshot = setElementSnapshot(base, {
      id: 'el-2',
      imageDataUrl: 'data:image/png;base64,AAA',
      sourceHash,
      createdAt: 1,
      updatedAt: 1,
      width: 480,
      height: 480,
      mimeType: 'image/png',
    });

    expect(resolveElementSnapshotStatus(withSnapshot)).toBe('fresh');
    const refreshed = refreshElementSnapshotStatus(withSnapshot);
    expect((refreshed.renderState as Record<string, unknown>).snapshotStatus).toBe('fresh');
  });

  it('returns outdated when visual state changes after snapshot', () => {
    const base = {
      id: 'el-3',
      type: 'free_rect',
      params: { width: 0.4, height: 0.2, fill: '#999' },
    } as Record<string, unknown>;
    const sourceHash = generateElementRenderHash(base);
    const withSnapshot = setElementSnapshot(base, {
      id: 'el-3',
      imageDataUrl: 'data:image/png;base64,AAA',
      sourceHash,
      createdAt: 1,
      updatedAt: 1,
      width: 480,
      height: 480,
      mimeType: 'image/png',
    });

    const edited = {
      ...withSnapshot,
      params: { width: 0.6, height: 0.2, fill: '#999' },
    } as Record<string, unknown>;

    expect(resolveElementSnapshotStatus(edited)).toBe('outdated');
    const refreshed = refreshElementSnapshotStatus(edited);
    expect((refreshed.renderState as Record<string, unknown>).snapshotStatus).toBe('outdated');
  });

  it('keeps snapshot fresh when only mask data changes', () => {
    const base = {
      id: 'el-4',
      type: 'free_rect',
      params: { width: 0.4, height: 0.2, fill: '#999' },
      mask: {
        enabled: true,
        coordinateSpace: 'local',
        strokes: [
          { tool: 'selection', shape: 'rect', action: 'reveal', opacity: 1, x: 10, y: 10, width: 40, height: 40 },
        ],
      },
    } as Record<string, unknown>;
    const sourceHash = generateElementRenderHash(base);
    const withSnapshot = setElementSnapshot(base, {
      id: 'el-4',
      imageDataUrl: 'data:image/png;base64,AAA',
      sourceHash,
      createdAt: 1,
      updatedAt: 1,
      width: 480,
      height: 480,
      mimeType: 'image/png',
    });

    const maskEdited = {
      ...withSnapshot,
      mask: {
        enabled: true,
        coordinateSpace: 'local',
        strokes: [
          { tool: 'selection', shape: 'rect', action: 'reveal', opacity: 1, x: 18, y: 15, width: 40, height: 40 },
        ],
      },
    } as Record<string, unknown>;

    expect(resolveElementSnapshotStatus(maskEdited)).toBe('fresh');
    const refreshed = refreshElementSnapshotStatus(maskEdited);
    expect((refreshed.renderState as Record<string, unknown>).snapshotStatus).toBe('fresh');
  });
});
