import type { ParameterProfile } from './parameterProfiles';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToPrecision(value: number, precision: number): number {
  const safePrecision = Math.max(0, Math.min(6, Math.floor(precision)));
  const factor = 10 ** safePrecision;
  return Math.round(value * factor) / factor;
}

export function normalizeMappedParameterValue(
  value: number,
  profile: ParameterProfile | undefined,
  min: number,
  max: number,
): number {
  const safe = Number.isFinite(value) ? value : min;
  const clamped = clamp(safe, min, max);
  const precision = profile?.precision ?? 3;
  return roundToPrecision(clamped, precision);
}
