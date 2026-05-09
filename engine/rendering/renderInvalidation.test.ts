import { beforeEach, describe, expect, it } from 'vitest';
import {
  consumeDirtyElementIds,
  getDirtyElementIds,
  getElementDirtyReason,
  isElementDirty,
  markElementDirty,
  markElementsDirty,
  resetRenderInvalidationState,
} from './renderInvalidation';

describe('renderInvalidation', () => {
  beforeEach(() => {
    resetRenderInvalidationState();
  });

  it('marks target element dirty with reason', () => {
    markElementDirty('el-1', 'transform');

    expect(isElementDirty('el-1')).toBe(true);
    expect(getElementDirtyReason('el-1')).toBe('transform');
    expect(getDirtyElementIds()).toEqual(['el-1']);
  });

  it('supports marking multiple target elements dirty', () => {
    markElementsDirty(['el-1', 'el-2'], 'effects');

    expect(isElementDirty('el-1')).toBe(true);
    expect(isElementDirty('el-2')).toBe(true);
    expect(getElementDirtyReason('el-1')).toBe('effects');
    expect(getElementDirtyReason('el-2')).toBe('effects');
  });

  it('consumes dirty ids and resets state', () => {
    markElementDirty('el-1', 'mask');
    markElementDirty('el-2', 'snapshot');

    const consumed = consumeDirtyElementIds().sort();

    expect(consumed).toEqual(['el-1', 'el-2']);
    expect(getDirtyElementIds()).toEqual([]);
    expect(isElementDirty('el-1')).toBe(false);
  });

  it('ignores empty element ids', () => {
    markElementDirty('   ', 'geometry');
    markElementsDirty(['', '  '], 'transform');

    expect(getDirtyElementIds()).toEqual([]);
  });
});
