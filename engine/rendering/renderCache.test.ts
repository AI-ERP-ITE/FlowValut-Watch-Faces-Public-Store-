import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearCachedRenderAll,
  getCachedRenderElementIds,
  getCachedRender,
  getCachedRenderSize,
  invalidateCachedRender,
  removeCachedRender,
  setCachedRender,
} from './renderCache';

describe('renderCache', () => {
  beforeEach(() => {
    clearCachedRenderAll();
  });

  it('stores and retrieves cache entries by element id', () => {
    setCachedRender('el-1', {
      hash: 'rh1:h1234',
      renderedOutput: '<g id="el-1" />',
      createdAt: 100,
    });

    const found = getCachedRender('el-1');

    expect(found).toEqual({
      hash: 'rh1:h1234',
      renderedOutput: '<g id="el-1" />',
      createdAt: 100,
    });
    expect(getCachedRenderSize()).toBe(1);
  });

  it('returns clones so external mutation does not alter stored cache', () => {
    setCachedRender('el-2', {
      hash: 'rh1:h5678',
      renderedOutput: '<g id="el-2" />',
      createdAt: 200,
    });

    const first = getCachedRender('el-2');
    if (!first) throw new Error('missing cache');
    first.hash = 'mutated';

    const second = getCachedRender('el-2');

    expect(second?.hash).toBe('rh1:h5678');
  });

  it('invalidates and removes entries by element id', () => {
    setCachedRender('el-3', {
      hash: 'rh1:h9999',
      renderedOutput: '<g id="el-3" />',
      createdAt: 300,
    });

    invalidateCachedRender('el-3');
    expect(getCachedRender('el-3')).toBeUndefined();

    setCachedRender('el-3', {
      hash: 'rh1:h0001',
      renderedOutput: '<g id="el-3b" />',
      createdAt: 400,
    });
    removeCachedRender('el-3');
    expect(getCachedRender('el-3')).toBeUndefined();
  });

  it('clears all entries only on explicit global clear', () => {
    setCachedRender('el-a', {
      hash: 'rh1:ha',
      renderedOutput: '<g id="a" />',
      createdAt: 1,
    });
    setCachedRender('el-b', {
      hash: 'rh1:hb',
      renderedOutput: '<g id="b" />',
      createdAt: 2,
    });

    expect(getCachedRenderSize()).toBe(2);

    clearCachedRenderAll();

    expect(getCachedRenderSize()).toBe(0);
    expect(getCachedRender('el-a')).toBeUndefined();
    expect(getCachedRender('el-b')).toBeUndefined();
  });

  it('lists cached element ids for selective scheduler cleanup', () => {
    setCachedRender('el-a', {
      hash: 'rh1:ha',
      renderedOutput: '<g id="a" />',
      createdAt: 1,
    });
    setCachedRender('el-b', {
      hash: 'rh1:hb',
      renderedOutput: '<g id="b" />',
      createdAt: 2,
    });

    expect(getCachedRenderElementIds().sort()).toEqual(['el-a', 'el-b']);
  });

  it('ignores empty element ids', () => {
    setCachedRender('   ', {
      hash: 'rh1:hx',
      renderedOutput: '<g />',
      createdAt: 123,
    });

    expect(getCachedRenderSize()).toBe(0);
    expect(getCachedRender('   ')).toBeUndefined();
  });
});
