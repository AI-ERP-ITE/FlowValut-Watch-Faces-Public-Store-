import { describe, expect, it } from 'vitest';
import { dropShadowPaddingForBake, normalizeDepthEffectRecord, normalizeDropShadowForBake } from './effectNormalization';

describe('effectNormalization drop shadow helpers', () => {
  it('normalizes color channels and numeric fields for bake', () => {
    const normalized = normalizeDropShadowForBake({
      color: '#111213',
      opacity: 1.4,
      blur: 6.7,
      offsetX: 2.4,
      offsetY: -3.6,
    });

    expect(normalized.color).toBe('#2f2f2f');
    expect(normalized.opacity).toBe(1);
    expect(normalized.blur).toBe(7);
    expect(normalized.offsetX).toBe(2);
    expect(normalized.offsetY).toBe(-4);
  });

  it('computes padding from normalized shadow values', () => {
    const pad = dropShadowPaddingForBake({
      color: '#111213',
      opacity: 0.6,
      blur: 7.4,
      offsetX: -2.6,
      offsetY: 3.2,
    });

    // blur -> 7, max(|offset|) -> 3, margin -> 4
    expect(pad).toBe(14);
  });

  it('normalizes depth-effect controls into renderer-safe ranges', () => {
    const normalized = normalizeDepthEffectRecord({
      enabled: true,
      intensity: 2,
      angle: 'bad',
      distance: 99,
      falloff: -10,
      whiteBalance: -4,
      spread: 9,
    });

    expect(normalized.enabled).toBe(true);
    expect(normalized.intensity).toBe(1);
    expect(normalized.angle).toBe(-35);
    expect(normalized.distance).toBe(6);
    expect(normalized.falloff).toBe(0.2);
    expect(normalized.whiteBalance).toBe(-1);
    expect(normalized.spread).toBe(1);
  });
});
