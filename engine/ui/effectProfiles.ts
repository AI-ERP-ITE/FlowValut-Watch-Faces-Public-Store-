import type { ParameterCurve, ParameterProfile } from './shadowProfiles';

export type EffectParameterProfileKey =
  | 'highlight'
  | 'shadows'
  | 'contrast'
  | 'sharpness'
  | 'colorOpacity'
  | 'depthIntensity'
  | 'depthOpacity'
  | 'lightX'
  | 'lightY'
  | 'lightZ'
  | 'depthDistance'
  | 'depthFalloff'
  | 'depthWhiteBalance'
  | 'depthSpread';

export type { ParameterCurve, ParameterProfile };

// Watchface-safe effect parameter behavior envelopes.
// UI range is always clean integers (−100..100 or 0..100).
// Render range is compressed to perceptually safe values for watchface display.
export const EFFECT_PARAMETER_PROFILE_REGISTRY: Record<
  EffectParameterProfileKey,
  ParameterProfile
> = {
  // ── Style FX ──────────────────────────────────────────────────────────────
  highlight: {
    uiMin: -100,
    uiMax: 100,
    renderMin: -0.20,
    renderMax: 0.20,
    curve: 'soft-knee',
    precision: 4,
    debounceMs: 16,
    adaptiveStep: true,
  },
  shadows: {
    uiMin: -100,
    uiMax: 100,
    renderMin: -0.20,
    renderMax: 0.20,
    curve: 'soft-knee',
    precision: 4,
    debounceMs: 16,
    adaptiveStep: true,
  },
  contrast: {
    uiMin: -100,
    uiMax: 100,
    renderMin: -0.18,
    renderMax: 0.18,
    curve: 'gamma',
    precision: 4,
    debounceMs: 16,
    adaptiveStep: true,
  },
  sharpness: {
    uiMin: 0,
    uiMax: 100,
    renderMin: 0,
    renderMax: 0.35,
    curve: 'exponential',
    precision: 4,
    debounceMs: 16,
    adaptiveStep: true,
  },
  colorOpacity: {
    uiMin: 0,
    uiMax: 100,
    renderMin: 0,
    renderMax: 1.00,
    curve: 'linear',
    precision: 4,
    debounceMs: 16,
    adaptiveStep: false,
  },

  // ── Depth FX ──────────────────────────────────────────────────────────────
  depthIntensity: {
    uiMin: 0,
    uiMax: 100,
    renderMin: 0,
    renderMax: 0.45,
    curve: 'gamma',
    precision: 4,
    debounceMs: 16,
    adaptiveStep: true,
  },
  depthOpacity: {
    uiMin: 0,
    uiMax: 100,
    renderMin: 0,
    renderMax: 0.50,
    curve: 'gamma',
    precision: 4,
    debounceMs: 16,
    adaptiveStep: true,
  },
  lightX: {
    uiMin: -100,
    uiMax: 100,
    renderMin: -1.00,
    renderMax: 1.00,
    curve: 'soft-knee',
    precision: 4,
    debounceMs: 16,
    adaptiveStep: true,
  },
  lightY: {
    uiMin: -100,
    uiMax: 100,
    renderMin: -1.00,
    renderMax: 1.00,
    curve: 'soft-knee',
    precision: 4,
    debounceMs: 16,
    adaptiveStep: true,
  },
  lightZ: {
    uiMin: 0,
    uiMax: 100,
    renderMin: 0.20,
    renderMax: 1.00,
    curve: 'soft-knee',
    precision: 4,
    debounceMs: 16,
    adaptiveStep: true,
  },
  depthDistance: {
    uiMin: 0,
    uiMax: 100,
    renderMin: 0.60,
    renderMax: 1.60,
    curve: 'soft-knee',
    precision: 4,
    debounceMs: 16,
    adaptiveStep: true,
  },
  depthFalloff: {
    uiMin: 0,
    uiMax: 100,
    renderMin: 0.60,
    renderMax: 1.50,
    curve: 'soft-knee',
    precision: 4,
    debounceMs: 16,
    adaptiveStep: true,
  },
  depthWhiteBalance: {
    uiMin: -100,
    uiMax: 100,
    renderMin: -0.25,
    renderMax: 0.25,
    curve: 'soft-knee',
    precision: 4,
    debounceMs: 16,
    adaptiveStep: true,
  },
  depthSpread: {
    uiMin: 0,
    uiMax: 100,
    renderMin: 0,
    renderMax: 0.25,
    curve: 'soft-knee',
    precision: 4,
    debounceMs: 16,
    adaptiveStep: true,
  },
};

export function hasEffectParameterProfile(
  key: string,
): key is EffectParameterProfileKey {
  return key in EFFECT_PARAMETER_PROFILE_REGISTRY;
}

export function getEffectParameterProfile(
  key: EffectParameterProfileKey,
): ParameterProfile {
  return EFFECT_PARAMETER_PROFILE_REGISTRY[key];
}
