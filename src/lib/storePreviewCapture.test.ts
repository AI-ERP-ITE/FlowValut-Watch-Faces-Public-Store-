import { describe, expect, it, vi } from 'vitest';
import { captureStableCanvas, captureStorePreviews, type StorePreviewCanvas } from './storePreviewCapture';

const canvas = (value: string): StorePreviewCanvas => ({
  toDataURL: () => value,
});

describe('captureStorePreviews', () => {
  it('keeps isolated Main and AOD scene outputs in semantic order', async () => {
    const capture = vi.fn(async (target: StorePreviewCanvas) => target.toDataURL('image/png'));

    await expect(captureStorePreviews({
      mainCanvas: canvas('main-background+main-widgets'),
      aodCanvas: canvas('aod-background+aod-widgets'),
      hasExplicitAod: true,
      capture,
    })).resolves.toEqual({
      main: 'main-background+main-widgets',
      aod: 'aod-background+aod-widgets',
    });
  });

  it('duplicates the exact Main PNG when no explicit AOD exists', async () => {
    const capture = vi.fn(async (target: StorePreviewCanvas) => target.toDataURL('image/png'));
    const result = await captureStorePreviews({
      mainCanvas: canvas('main-png'),
      aodCanvas: canvas('must-not-be-used'),
      hasExplicitAod: false,
      capture,
    });

    expect(result).toEqual({ main: 'main-png', aod: 'main-png' });
    expect(capture).toHaveBeenCalledTimes(1);
  });
});

describe('captureStableCanvas', () => {
  it('waits until changing canvas output settles', async () => {
    vi.useFakeTimers();
    const values = ['loading', 'loading', 'complete', 'complete', 'complete'];
    const target: StorePreviewCanvas = {
      toDataURL: () => values.shift() ?? 'complete',
    };

    const pending = captureStableCanvas(target, {
      sampleIntervalMs: 10,
      settleMs: 20,
      timeoutMs: 100,
    });
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toBe('complete');
    vi.useRealTimers();
  });
});
