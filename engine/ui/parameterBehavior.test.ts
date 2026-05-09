import { describe, expect, it } from 'vitest';
import { resolveAdaptiveRenderStep } from './adaptiveSteps';
import { mapUiValueToRenderValue } from './parameterMapping';
import { getParameterProfile } from './parameterProfiles';
import { normalizeSliderDebounceMs, shouldApplySliderUpdate } from './sliderThrottle';

function expectMonotonicNonDecreasing(values: number[]): void {
  for (let i = 1; i < values.length; i += 1) {
    expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
  }
}

function sampleUiRange(start: number, end: number, step: number): number[] {
  const values: number[] = [];
  for (let value = start; value <= end + 1e-9; value += step) {
    values.push(Number(value.toFixed(6)));
  }
  return values;
}

function countAppliedUpdates(eventTimes: number[], debounceMs: number): number {
  let lastApplied = Number.NEGATIVE_INFINITY;
  let count = 0;

  for (const time of eventTimes) {
    if (shouldApplySliderUpdate(time, lastApplied, debounceMs)) {
      count += 1;
      lastApplied = time;
    }
  }

  return count;
}

describe('parameter behavior validation', () => {
  it('keeps blur near zero smooth and monotonic', () => {
    const profile = getParameterProfile('shadowBlur');
    expect(profile).toBeTruthy();

    const uiSamples = sampleUiRange(0, 10, 0.5);
    const renderSamples = uiSamples.map((uiValue) => mapUiValueToRenderValue(uiValue, profile!));

    expectMonotonicNonDecreasing(renderSamples);

    const deltas = renderSamples.slice(1).map((value, index) => value - renderSamples[index]);
    const maxDelta = Math.max(...deltas);
    expect(maxDelta).toBeLessThan(1.2);
  });

  it('keeps opacity progression without abrupt disappearance', () => {
    const profile = getParameterProfile('shadowOpacity');
    expect(profile).toBeTruthy();

    const uiSamples = sampleUiRange(0, 20, 1);
    const renderSamples = uiSamples.map((uiValue) => mapUiValueToRenderValue(uiValue, profile!));

    expectMonotonicNonDecreasing(renderSamples);
    expect(renderSamples[0]).toBe(0);
    expect(renderSamples[1]).toBeGreaterThan(0);
    expect(renderSamples[5]).toBeGreaterThan(renderSamples[1]);
  });

  it('keeps spread stable at small value ranges', () => {
    const profile = getParameterProfile('shadowSpread');
    expect(profile).toBeTruthy();

    const uiSamples = sampleUiRange(0, 20, 0.5);
    const renderSamples = uiSamples.map((uiValue) => mapUiValueToRenderValue(uiValue, profile!));

    expectMonotonicNonDecreasing(renderSamples);

    const lowRangeDeltas = renderSamples.slice(1, 16).map((value, index) => value - renderSamples[index]);
    const maxLowRangeDelta = Math.max(...lowRangeDeltas);
    expect(maxLowRangeDelta).toBeLessThan(0.2);
  });

  it('reduces slider drag write spam with minimum 16ms gating', () => {
    const debounceMs = normalizeSliderDebounceMs(8);
    expect(debounceMs).toBe(16);

    const dragEventTimes = Array.from({ length: 240 }, (_, index) => index);
    const baselineWrites = dragEventTimes.length;
    const throttledWrites = countAppliedUpdates(dragEventTimes, debounceMs);

    expect(throttledWrites).toBeLessThan(baselineWrites * 0.2);
    expect(throttledWrites).toBeGreaterThan(8);
  });

  it('improves large-scene interaction responsiveness via adaptive stepping and throttle gating', () => {
    const profile = getParameterProfile('shadowBlur');
    expect(profile).toBeTruthy();

    const lowStep = resolveAdaptiveRenderStep(profile, 2, 0.5);
    const highStep = resolveAdaptiveRenderStep(profile, 48, 0.5);
    expect(highStep).toBeGreaterThan(lowStep);

    const layerCount = 24;
    const dragEventTimes = Array.from({ length: 320 }, (_, index) => index);
    const baselineWrites = layerCount * dragEventTimes.length;
    const throttledWritesPerLayer = countAppliedUpdates(dragEventTimes, normalizeSliderDebounceMs(profile?.debounceMs));
    const throttledWrites = layerCount * throttledWritesPerLayer;

    expect(throttledWrites).toBeLessThan(baselineWrites * 0.2);
  });
});
