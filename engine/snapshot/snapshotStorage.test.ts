import { describe, expect, it } from 'vitest';
import { generateElementRenderHash } from './snapshotHash';
import {
  deleteElementSnapshot,
  refreshElementSnapshotStatus,
  resolveElementSnapshotStatus,
  setElementRenderSourceMode,
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

  it('keeps snapshot mode fresh when revision hash identity matches', () => {
    const base = {
      id: 'el-3b',
      type: 'free_rect',
      params: { width: 0.4, height: 0.2, fill: '#999' },
    } as Record<string, unknown>;
    const sourceHash = generateElementRenderHash(base);
    const withSnapshot = setElementSnapshot(base, {
      id: 'el-3b',
      imageDataUrl: 'data:image/png;base64,AAA',
      sourceHash,
      snapshotRevisionHash: 'r1:habc12345',
      createdAt: 1,
      updatedAt: 1,
      width: 480,
      height: 480,
      mimeType: 'image/png',
    });

    const edited = {
      ...withSnapshot,
      params: { width: 0.6, height: 0.2, fill: '#999' },
      renderState: {
        ...((withSnapshot.renderState as Record<string, unknown>) ?? {}),
        sourceMode: 'snapshot',
        snapshotRevisionHash: 'r1:habc12345',
      },
    } as Record<string, unknown>;

    expect(resolveElementSnapshotStatus(edited)).toBe('fresh');
    const refreshed = refreshElementSnapshotStatus(edited);
    expect((refreshed.renderState as Record<string, unknown>).snapshotStatus).toBe('fresh');
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

  it('keeps procedural fields intact when deleting snapshot', () => {
    const base = {
      id: 'el-5',
      type: 'free_rect',
      params: { width: 0.42, height: 0.21, fill: '#a0a0a0', stroke: '#ffffff', thickness: 0.01 },
      dropShadow: { enabled: true, opacity: 0.5, blur: 8, offsetX: 2, offsetY: 2 },
      mask: {
        enabled: true,
        coordinateSpace: 'local',
        strokes: [
          { tool: 'selection', shape: 'rect', action: 'reveal', opacity: 1, x: 12, y: 12, width: 30, height: 30 },
        ],
      },
    } as Record<string, unknown>;
    const sourceHash = generateElementRenderHash(base);
    const withSnapshot = setElementSnapshot(base, {
      id: 'el-5',
      imageDataUrl: 'data:image/png;base64,AAA',
      sourceHash,
      createdAt: 1,
      updatedAt: 1,
      width: 480,
      height: 480,
      mimeType: 'image/png',
    });

    const deleted = deleteElementSnapshot(withSnapshot);

    expect((deleted.renderState as Record<string, unknown>).sourceMode).toBe('live');
    expect((deleted.renderState as Record<string, unknown>).snapshot).toBeNull();
    expect((deleted.renderState as Record<string, unknown>).snapshotStatus).toBe('missing');
    expect((deleted.renderState as Record<string, unknown>).lastSnapshotFrame).toEqual({ width: 480, height: 480 });
    expect((deleted.params as Record<string, unknown>).width).toBe(0.42);
    expect(((deleted.mask as Record<string, unknown>).strokes as Array<unknown>).length).toBe(1);
  });

  it('computes status when switching to snapshot mode without mutating procedural fields', () => {
    const element = {
      id: 'el-6',
      type: 'free_rect',
      params: { width: 0.5, height: 0.2, fill: '#999' },
      renderState: {
        sourceMode: 'live',
        snapshotStatus: 'missing',
        snapshot: {
          id: 'el-6',
          imageDataUrl: 'data:image/png;base64,AAA',
          sourceHash: 'v1:hstale000',
          createdAt: 1,
          updatedAt: 1,
          width: 480,
          height: 480,
          mimeType: 'image/png',
        },
      },
    } as Record<string, unknown>;

    const switched = setElementRenderSourceMode(element, 'snapshot');

    expect((switched.renderState as Record<string, unknown>).sourceMode).toBe('snapshot');
    expect((switched.renderState as Record<string, unknown>).snapshotStatus).toBe('outdated');
    expect((switched.params as Record<string, unknown>).width).toBe(0.5);
  });

  it('retains last snapshot frame through render-state normalization', () => {
    const element = {
      id: 'el-7',
      type: 'free_rect',
      params: { width: 0.3, height: 0.2, fill: '#888' },
      renderState: {
        sourceMode: 'live',
        snapshotStatus: 'missing',
        lastSnapshotFrame: { width: 320, height: 280 },
        snapshot: null,
      },
    } as Record<string, unknown>;

    const refreshed = refreshElementSnapshotStatus(element);
    const renderState = refreshed.renderState as Record<string, unknown>;

    expect(renderState.lastSnapshotFrame).toEqual({ width: 320, height: 280 });
    expect(renderState.snapshotStatus).toBe('missing');
  });
});
