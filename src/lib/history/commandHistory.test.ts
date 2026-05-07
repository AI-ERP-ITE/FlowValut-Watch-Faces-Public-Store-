import { describe, expect, it } from 'vitest';
import {
  pushHistoryCommand,
  redoHistory,
  type HistoryCommand,
  undoHistory,
} from './commandHistory';

type TemplateState = {
  elements: Array<{
    id: string;
    mask?: Record<string, unknown>;
    renderState?: Record<string, unknown>;
  }>;
};

function command(
  id: string,
  label: string,
  before: TemplateState,
  after: TemplateState,
): HistoryCommand<TemplateState> {
  return {
    id,
    label,
    before,
    after,
    createdAt: Date.now(),
  };
}

describe('commandHistory snapshot+mask undo/redo', () => {
  it('restores expected states for snapshot, mask edit, and delete snapshot sequence', () => {
    const base: TemplateState = {
      elements: [
        {
          id: 'el-1',
          renderState: { sourceMode: 'live', snapshotStatus: 'missing', snapshot: null },
          mask: { enabled: false, strokes: [] },
        },
      ],
    };

    const withSnapshot: TemplateState = {
      elements: [
        {
          id: 'el-1',
          renderState: {
            sourceMode: 'live',
            snapshotStatus: 'fresh',
            snapshot: {
              id: 'el-1',
              imageDataUrl: 'data:image/png;base64,AAAA',
              sourceHash: 'v1:h00000000',
              width: 160,
              height: 160,
            },
          },
          mask: { enabled: false, strokes: [] },
        },
      ],
    };

    const snapshotModeWithMaskEdit: TemplateState = {
      elements: [
        {
          id: 'el-1',
          renderState: {
            sourceMode: 'snapshot',
            snapshotStatus: 'fresh',
            snapshot: {
              id: 'el-1',
              imageDataUrl: 'data:image/png;base64,AAAA',
              sourceHash: 'v1:h00000000',
              width: 160,
              height: 160,
            },
          },
          mask: {
            enabled: true,
            coordinateSpace: 'local',
            strokes: [{ x: 12, y: 10, width: 30, height: 24, action: 'reveal' }],
          },
        },
      ],
    };

    const liveAfterDelete: TemplateState = {
      elements: [
        {
          id: 'el-1',
          renderState: {
            sourceMode: 'live',
            snapshotStatus: 'missing',
            lastSnapshotFrame: { width: 160, height: 160 },
            snapshot: null,
          },
          mask: {
            enabled: true,
            coordinateSpace: 'local',
            strokes: [{ x: 12, y: 10, width: 30, height: 24, action: 'reveal' }],
          },
        },
      ],
    };

    let past: Array<HistoryCommand<TemplateState>> = [];
    let future: Array<HistoryCommand<TemplateState>> = [];

    ({ past, future } = pushHistoryCommand(past, command('c1', 'Create element snapshot', base, withSnapshot)));
    ({ past, future } = pushHistoryCommand(past, command('c2', 'Use element snapshot render source', withSnapshot, snapshotModeWithMaskEdit)));
    ({ past, future } = pushHistoryCommand(past, command('c3', 'Delete element snapshot', snapshotModeWithMaskEdit, liveAfterDelete)));

    const undoDelete = undoHistory(past, future);
    expect(undoDelete.command?.label).toBe('Delete element snapshot');
    expect(undoDelete.template).toEqual(snapshotModeWithMaskEdit);

    const undoUseSnapshot = undoHistory(undoDelete.stacks.past, undoDelete.stacks.future);
    expect(undoUseSnapshot.command?.label).toBe('Use element snapshot render source');
    expect(undoUseSnapshot.template).toEqual(withSnapshot);

    const undoCreateSnapshot = undoHistory(undoUseSnapshot.stacks.past, undoUseSnapshot.stacks.future);
    expect(undoCreateSnapshot.command?.label).toBe('Create element snapshot');
    expect(undoCreateSnapshot.template).toEqual(base);

    const redoCreateSnapshot = redoHistory(undoCreateSnapshot.stacks.past, undoCreateSnapshot.stacks.future);
    expect(redoCreateSnapshot.command?.label).toBe('Create element snapshot');
    expect(redoCreateSnapshot.template).toEqual(withSnapshot);

    const redoUseSnapshot = redoHistory(redoCreateSnapshot.stacks.past, redoCreateSnapshot.stacks.future);
    expect(redoUseSnapshot.command?.label).toBe('Use element snapshot render source');
    expect(redoUseSnapshot.template).toEqual(snapshotModeWithMaskEdit);

    const redoDelete = redoHistory(redoUseSnapshot.stacks.past, redoUseSnapshot.stacks.future);
    expect(redoDelete.command?.label).toBe('Delete element snapshot');
    expect(redoDelete.template).toEqual(liveAfterDelete);
  });

  it('clears future stack when new mask command is pushed after undo', () => {
    const initial: TemplateState = {
      elements: [{ id: 'el-2', renderState: { sourceMode: 'live', snapshotStatus: 'missing', snapshot: null } }],
    };
    const withSnapshot: TemplateState = {
      elements: [{ id: 'el-2', renderState: { sourceMode: 'snapshot', snapshotStatus: 'fresh', snapshot: { id: 'el-2' } } }],
    };
    const withMaskA: TemplateState = {
      elements: [{ id: 'el-2', renderState: { sourceMode: 'snapshot', snapshotStatus: 'fresh', snapshot: { id: 'el-2' } }, mask: { enabled: true, strokes: [{ x: 8 }] } }],
    };
    const withMaskB: TemplateState = {
      elements: [{ id: 'el-2', renderState: { sourceMode: 'snapshot', snapshotStatus: 'fresh', snapshot: { id: 'el-2' } }, mask: { enabled: true, strokes: [{ x: 20 }] } }],
    };

    let past: Array<HistoryCommand<TemplateState>> = [];
    let future: Array<HistoryCommand<TemplateState>> = [];

    ({ past, future } = pushHistoryCommand(past, command('c1', 'Use element snapshot render source', initial, withSnapshot)));
    ({ past, future } = pushHistoryCommand(past, command('c2', 'Edit mask stroke A', withSnapshot, withMaskA)));

    const undone = undoHistory(past, future);
    expect(undone.template).toEqual(withSnapshot);
    expect(undone.stacks.future).toHaveLength(1);

    const repushed = pushHistoryCommand(undone.stacks.past, command('c3', 'Edit mask stroke B', withSnapshot, withMaskB));
    expect(repushed.future).toEqual([]);
  });

  it('returns cloned template payloads from undo/redo operations', () => {
    const before: TemplateState = {
      elements: [{ id: 'el-3', mask: { enabled: true, strokes: [{ x: 1 }] } }],
    };
    const after: TemplateState = {
      elements: [{ id: 'el-3', mask: { enabled: true, strokes: [{ x: 2 }] } }],
    };

    const stacks = pushHistoryCommand([], command('c1', 'Edit mask stroke', before, after));

    const undone = undoHistory(stacks.past, stacks.future);
    if (!undone.template) throw new Error('Expected undo template');
    (undone.template.elements[0].mask as { strokes: Array<{ x: number }> }).strokes[0].x = 999;

    const redone = redoHistory(undone.stacks.past, undone.stacks.future);
    if (!redone.template) throw new Error('Expected redo template');

    const restoredX = ((redone.template.elements[0].mask as { strokes: Array<{ x: number }> }).strokes[0].x);
    expect(restoredX).toBe(2);
  });
});
