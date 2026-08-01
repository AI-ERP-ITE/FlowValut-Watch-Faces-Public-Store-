import { getDataRepresentationDescriptor } from './dataRepresentationAuthority';

export function normalizeBoundedDataValue(dataType: string, value: number): number {
  const range = getDataRepresentationDescriptor(dataType)?.valueRange;
  if (!range || range.max <= range.min) return 0;
  const clamped = Math.min(range.max, Math.max(range.min, value));
  return (clamped - range.min) / (range.max - range.min);
}

export function resolveBoundedGaugeAngle(
  dataType: string,
  value: number,
  startAngle: number,
  endAngle: number,
): number {
  return startAngle + normalizeBoundedDataValue(dataType, value) * (endAngle - startAngle);
}

