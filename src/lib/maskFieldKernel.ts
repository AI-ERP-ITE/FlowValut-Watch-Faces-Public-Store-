export type MaskEditMode = 'hide' | 'reveal';

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function clampU8(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const n = Math.round(value);
  if (n < 0) return 0;
  if (n > 255) return 255;
  return n;
}

export function maskStrength(opacity: number, falloff: number, pressure = 1): number {
  return clamp01(clamp01(opacity) * clamp01(falloff) * clamp01(pressure));
}

export function applyMaskValueU8(prev: number, mode: MaskEditMode, strength: number): number {
  const base = clampU8(prev);
  const delta = clampU8(maskStrength(strength, 1, 1) * 255);
  if (mode === 'hide') return Math.max(0, base - delta);
  return Math.min(255, base + delta);
}
