import type { ParameterProfile } from './shadowProfiles';

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

function roundToPrecision(value: number, precision: number): number {
  const safePrecision = Math.max(0, Math.min(6, Math.floor(precision)));
  const factor = 10 ** safePrecision;
  return Math.round(value * factor) / factor;
}

export function resolveAdaptiveRenderStep(
  profile: ParameterProfile | undefined,
  currentUiValue: number,
  baseStep: number,
): number {
  const safeBase = Number.isFinite(baseStep) && baseStep > 0 ? baseStep : 0.01;
  if (!profile || profile.adaptiveStep !== true) {
    return safeBase;
  }

  const uiRange = profile.uiMax - profile.uiMin;
  if (!Number.isFinite(uiRange) || Math.abs(uiRange) < EPSILON) {
    return safeBase;
  }

  const signedRange = profile.uiMin < 0 && profile.uiMax > 0;
  const ratioSource = signedRange
    ? Math.abs(currentUiValue) / Math.max(Math.abs(profile.uiMin), Math.abs(profile.uiMax))
    : (currentUiValue - profile.uiMin) / uiRange;
  const uiRatio = clamp01(ratioSource);

  let multiplier = 1;
  if (uiRatio < 0.12) {
    multiplier = 0.2;
  } else if (uiRatio < 0.3) {
    multiplier = 0.45;
  } else if (uiRatio < 0.55) {
    multiplier = 0.75;
  } else if (uiRatio < 0.8) {
    multiplier = 1;
  } else {
    multiplier = 1.5;
  }

  if ((profile.curve === 'gamma' || profile.curve === 'exponential') && uiRatio > 0.75) {
    multiplier *= 1.15;
  }

  const minStep = safeBase * 0.25;
  const maxStep = safeBase * 2.5;
  const stepped = safeBase * multiplier;
  const clampedStep = Math.max(minStep, Math.min(maxStep, stepped));

  return roundToPrecision(clampedStep, profile.precision + 2);
}
