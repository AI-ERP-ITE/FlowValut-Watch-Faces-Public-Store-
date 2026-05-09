import type { ParameterProfile } from './parameterProfiles';
import { mapRenderValueToUiValue } from './parameterMapping';

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
  currentRenderValue: number,
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

  const uiValue = mapRenderValueToUiValue(currentRenderValue, profile);
  const uiRatio = clamp01((uiValue - profile.uiMin) / uiRange);

  let multiplier = 1;
  if (uiRatio < 0.2) {
    multiplier = 0.35;
  } else if (uiRatio < 0.5) {
    multiplier = 0.65;
  } else if (uiRatio < 0.8) {
    multiplier = 1;
  } else {
    multiplier = 1.8;
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
