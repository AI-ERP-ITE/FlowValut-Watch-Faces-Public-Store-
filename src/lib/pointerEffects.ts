import type { WatchFaceElement } from '@/types';

// Spec 031 scope guard:
// This module only normalizes/applies TIME_POINTER image effects used by preview/export parity.
// Non-goals: introducing unrelated rendering effects, changing legacy 030 behavior, or mutating non-pointer widgets.

export const POINTER_EFFECT_LIMITS = {
  brightness: { min: -100, max: 100 },
  contrast: { min: -100, max: 100 },
  saturation: { min: -100, max: 100 },
  opacity: { min: 0, max: 1 },
} as const;

export const POINTER_EFFECT_DEFAULTS = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  opacity: 1,
} as const;

export interface NormalizedPointerEffects {
  brightness: number;
  contrast: number;
  saturation: number;
  opacity: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function normalizePointerEffects(
  input: Partial<Pick<WatchFaceElement, 'pointerBrightness' | 'pointerContrast' | 'pointerSaturation' | 'pointerOpacity'>>,
): NormalizedPointerEffects {
  const brightness = clamp(
    input.pointerBrightness ?? POINTER_EFFECT_DEFAULTS.brightness,
    POINTER_EFFECT_LIMITS.brightness.min,
    POINTER_EFFECT_LIMITS.brightness.max,
  );
  const contrast = clamp(
    input.pointerContrast ?? POINTER_EFFECT_DEFAULTS.contrast,
    POINTER_EFFECT_LIMITS.contrast.min,
    POINTER_EFFECT_LIMITS.contrast.max,
  );
  const saturation = clamp(
    input.pointerSaturation ?? POINTER_EFFECT_DEFAULTS.saturation,
    POINTER_EFFECT_LIMITS.saturation.min,
    POINTER_EFFECT_LIMITS.saturation.max,
  );
  const opacity = clamp(
    input.pointerOpacity ?? POINTER_EFFECT_DEFAULTS.opacity,
    POINTER_EFFECT_LIMITS.opacity.min,
    POINTER_EFFECT_LIMITS.opacity.max,
  );

  return { brightness, contrast, saturation, opacity };
}

export function pointerEffectsToCanvasFilter(effects: NormalizedPointerEffects): string {
  const brightnessFactor = 1 + effects.brightness / 100;
  const contrastFactor = 1 + effects.contrast / 100;
  const saturationFactor = 1 + effects.saturation / 100;
  return `brightness(${brightnessFactor}) contrast(${contrastFactor}) saturate(${saturationFactor})`;
}

export function hasNonDefaultPointerEffects(effects: NormalizedPointerEffects): boolean {
  const epsilon = 1e-6;
  return (
    Math.abs(effects.brightness - POINTER_EFFECT_DEFAULTS.brightness) > epsilon
    || Math.abs(effects.contrast - POINTER_EFFECT_DEFAULTS.contrast) > epsilon
    || Math.abs(effects.saturation - POINTER_EFFECT_DEFAULTS.saturation) > epsilon
    || Math.abs(effects.opacity - POINTER_EFFECT_DEFAULTS.opacity) > epsilon
  );
}

export function drawWithPointerEffects(
  ctx: CanvasRenderingContext2D,
  draw: () => void,
  effects: NormalizedPointerEffects,
): void {
  if (!hasNonDefaultPointerEffects(effects)) {
    draw();
    return;
  }
  ctx.save();
  ctx.filter = pointerEffectsToCanvasFilter(effects);
  ctx.globalAlpha *= effects.opacity;
  draw();
  ctx.restore();
}
