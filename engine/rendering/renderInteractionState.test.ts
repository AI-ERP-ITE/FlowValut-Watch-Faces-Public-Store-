import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  beginRenderInteraction,
  endRenderInteraction,
  getRenderInteractionMode,
  getRenderQualityMode,
  resetRenderInteractionState,
  subscribeRenderInteractionMode,
} from './renderInteractionState';

describe('renderInteractionState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRenderInteractionState();
  });

  it('stays in editing during interaction and returns to idle after 100ms debounce', () => {
    beginRenderInteraction('drag');
    expect(getRenderInteractionMode()).toBe('editing');
    expect(getRenderQualityMode()).toBe('preview');

    endRenderInteraction('drag');
    expect(getRenderInteractionMode()).toBe('editing');

    vi.advanceTimersByTime(99);
    expect(getRenderInteractionMode()).toBe('editing');

    vi.advanceTimersByTime(1);
    expect(getRenderInteractionMode()).toBe('idle');
    expect(getRenderQualityMode()).toBe('final');
  });

  it('keeps editing while overlapping interactions exist and emits a single final idle transition', () => {
    const events: string[] = [];
    const unsubscribe = subscribeRenderInteractionMode((mode) => {
      events.push(mode);
    });

    beginRenderInteraction('brush');
    beginRenderInteraction('resize');
    endRenderInteraction('brush');

    vi.advanceTimersByTime(200);
    expect(getRenderInteractionMode()).toBe('editing');

    endRenderInteraction('resize');
    endRenderInteraction('resize');

    vi.advanceTimersByTime(100);
    expect(getRenderInteractionMode()).toBe('idle');

    const withoutInitialIdle = events.slice(1);
    expect(withoutInitialIdle).toEqual(['editing', 'idle']);

    unsubscribe();
  });
});
