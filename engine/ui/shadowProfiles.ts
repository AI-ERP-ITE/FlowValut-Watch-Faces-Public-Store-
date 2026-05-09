export type ParameterCurve =
  | 'linear'
  | 'exponential'
  | 'gamma'
  | 'soft-knee'
  | 'logarithmic';

export type ParameterProfile = {
  uiMin: number;
  uiMax: number;
  renderMin: number;
  renderMax: number;
  curve: ParameterCurve;
  precision: number;
  debounceMs?: number;
  adaptiveStep?: boolean;
};

export type ParameterProfileKey =
  | 'shadowOpacity'
  | 'shadowBlur'
  | 'shadowSpread'
  | 'shadowOffset';

// Watchface-safe shadow behavior envelope.
export const PARAMETER_PROFILE_REGISTRY: Record<
  ParameterProfileKey,
  ParameterProfile
> = {
  shadowOpacity: {
    uiMin: 0,
    uiMax: 100,
    renderMin: 0,
    renderMax: 0.35,
    curve: 'gamma',
    precision: 4,
    debounceMs: 16,
    adaptiveStep: true,
  },
  shadowBlur: {
    uiMin: 0,
    uiMax: 100,
    renderMin: 0,
    renderMax: 20,
    curve: 'exponential',
    precision: 3,
    debounceMs: 16,
    adaptiveStep: true,
  },
  shadowSpread: {
    uiMin: 0,
    uiMax: 100,
    renderMin: 0,
    renderMax: 0.25,
    curve: 'soft-knee',
    precision: 4,
    debounceMs: 16,
    adaptiveStep: true,
  },
  shadowOffset: {
    uiMin: -100,
    uiMax: 100,
    renderMin: -8,
    renderMax: 8,
    curve: 'soft-knee',
    precision: 3,
    debounceMs: 16,
    adaptiveStep: true,
  },
};

export function hasParameterProfile(
  key: ParameterProfileKey,
): key is keyof typeof PARAMETER_PROFILE_REGISTRY {
  return key in PARAMETER_PROFILE_REGISTRY;
}

export function getParameterProfile(
  key: ParameterProfileKey,
): ParameterProfile | undefined {
  return PARAMETER_PROFILE_REGISTRY[key];
}
