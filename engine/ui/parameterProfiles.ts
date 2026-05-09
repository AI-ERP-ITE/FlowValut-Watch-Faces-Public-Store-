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

// Registry exists now; concrete per-parameter values are added in T-012.
export const PARAMETER_PROFILE_REGISTRY: Partial<
  Record<ParameterProfileKey, ParameterProfile>
> = {
  shadowOpacity: {
    uiMin: 0,
    uiMax: 100,
    renderMin: 0,
    renderMax: 1,
    curve: 'gamma',
    precision: 4,
    debounceMs: 16,
    adaptiveStep: true,
  },
  shadowBlur: {
    uiMin: 0,
    uiMax: 100,
    renderMin: 0,
    renderMax: 64,
    curve: 'soft-knee',
    precision: 2,
    debounceMs: 16,
    adaptiveStep: true,
  },
  shadowSpread: {
    uiMin: 0,
    uiMax: 100,
    renderMin: 0,
    renderMax: 32,
    curve: 'exponential',
    precision: 2,
    debounceMs: 16,
    adaptiveStep: true,
  },
  shadowOffset: {
    uiMin: 0,
    uiMax: 100,
    renderMin: 0,
    renderMax: 48,
    curve: 'logarithmic',
    precision: 2,
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
