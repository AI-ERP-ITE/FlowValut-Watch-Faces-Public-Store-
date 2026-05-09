import type { ParameterCurve, ParameterProfile } from './shadowProfiles';

const EPSILON = 1e-9;

function clamp01(value: number): number {
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function normalizeToUnit(value: number, min: number, max: number): number {
  const range = max - min;
  if (Math.abs(range) < EPSILON) {
    return 0;
  }
  return clamp01((value - min) / range);
}

function denormalizeFromUnit(unit: number, min: number, max: number): number {
  return min + clamp01(unit) * (max - min);
}

function isSignedRange(min: number, max: number): boolean {
  return min < 0 && max > 0;
}

function mapSignedByCurve(unitSigned: number, curve: ParameterCurve): number {
  const clamped = Math.max(-1, Math.min(1, unitSigned));
  const sign = clamped < 0 ? -1 : 1;
  const magnitude = Math.abs(clamped);

  switch (curve) {
    case 'linear':
      return clamped;
    case 'exponential':
      return sign * Math.pow(magnitude, 1.8);
    case 'gamma':
      return sign * Math.pow(magnitude, 2.2);
    case 'soft-knee': {
      const kneeRaw = magnitude / (magnitude + 0.5);
      const atOne = 1 / 1.5;
      return sign * clamp01(kneeRaw / atOne);
    }
    case 'logarithmic':
      return sign * Math.log10(1 + magnitude * 9);
    default:
      return clamped;
  }
}

function mapSignedInverseByCurve(unitSigned: number, curve: ParameterCurve): number {
  const clamped = Math.max(-1, Math.min(1, unitSigned));
  const sign = clamped < 0 ? -1 : 1;
  const magnitude = Math.abs(clamped);

  switch (curve) {
    case 'linear':
      return clamped;
    case 'exponential':
      return sign * Math.pow(magnitude, 1 / 1.8);
    case 'gamma':
      return sign * Math.pow(magnitude, 1 / 2.2);
    case 'soft-knee': {
      if (magnitude >= 1) {
        return sign;
      }
      const inverse = clamp01((0.5 * magnitude) / (1.5 - magnitude));
      return sign * inverse;
    }
    case 'logarithmic':
      return sign * clamp01((Math.pow(10, magnitude) - 1) / 9);
    default:
      return clamped;
  }
}

function mapByCurve(unit: number, curve: ParameterCurve): number {
  const n = clamp01(unit);

  switch (curve) {
    case 'linear':
      return n;
    case 'exponential':
      return Math.pow(n, 1.8);
    case 'gamma':
      return Math.pow(n, 2.2);
    case 'soft-knee': {
      // First stage from spec: n / (n + 0.5), second stage renormalizes to [0,1].
      const kneeRaw = n / (n + 0.5);
      const atOne = 1 / 1.5;
      return clamp01(kneeRaw / atOne);
    }
    case 'logarithmic':
      return Math.log10(1 + n * 9);
    default:
      return n;
  }
}

function mapInverseByCurve(unit: number, curve: ParameterCurve): number {
  const y = clamp01(unit);

  switch (curve) {
    case 'linear':
      return y;
    case 'exponential':
      return Math.pow(y, 1 / 1.8);
    case 'gamma':
      return Math.pow(y, 1 / 2.2);
    case 'soft-knee': {
      // Inverse of normalized soft-knee: y = 1.5n / (n + 0.5)
      if (y >= 1) {
        return 1;
      }
      return clamp01((0.5 * y) / (1.5 - y));
    }
    case 'logarithmic':
      return clamp01((Math.pow(10, y) - 1) / 9);
    default:
      return y;
  }
}

export function mapUiValueToRenderValue(
  uiValue: number,
  profile: ParameterProfile,
): number {
  if (isSignedRange(profile.uiMin, profile.uiMax) && isSignedRange(profile.renderMin, profile.renderMax)) {
    const uiAbsMax = Math.max(Math.abs(profile.uiMin), Math.abs(profile.uiMax));
    const renderAbsMax = Math.max(Math.abs(profile.renderMin), Math.abs(profile.renderMax));
    if (uiAbsMax < EPSILON || renderAbsMax < EPSILON) {
      return 0;
    }
    const signedUnit = Math.max(-1, Math.min(1, uiValue / uiAbsMax));
    const mappedSignedUnit = mapSignedByCurve(signedUnit, profile.curve);
    return mappedSignedUnit * renderAbsMax;
  }

  const normalizedUi = normalizeToUnit(uiValue, profile.uiMin, profile.uiMax);
  const normalizedRender = mapByCurve(normalizedUi, profile.curve);
  return denormalizeFromUnit(
    normalizedRender,
    profile.renderMin,
    profile.renderMax,
  );
}

export function mapRenderValueToUiValue(
  renderValue: number,
  profile: ParameterProfile,
): number {
  if (isSignedRange(profile.uiMin, profile.uiMax) && isSignedRange(profile.renderMin, profile.renderMax)) {
    const uiAbsMax = Math.max(Math.abs(profile.uiMin), Math.abs(profile.uiMax));
    const renderAbsMax = Math.max(Math.abs(profile.renderMin), Math.abs(profile.renderMax));
    if (uiAbsMax < EPSILON || renderAbsMax < EPSILON) {
      return 0;
    }
    const signedUnit = Math.max(-1, Math.min(1, renderValue / renderAbsMax));
    const mappedSignedUnit = mapSignedInverseByCurve(signedUnit, profile.curve);
    return mappedSignedUnit * uiAbsMax;
  }

  const normalizedRender = normalizeToUnit(
    renderValue,
    profile.renderMin,
    profile.renderMax,
  );
  const normalizedUi = mapInverseByCurve(normalizedRender, profile.curve);
  return denormalizeFromUnit(normalizedUi, profile.uiMin, profile.uiMax);
}
