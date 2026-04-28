import type { WatchFaceElement } from '@/types';

export type DropShadowConfig = NonNullable<WatchFaceElement['dropShadow']>;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function normalizeDropShadowForBake(ds: DropShadowConfig): DropShadowConfig {
  return {
    ...ds,
    blur: Math.max(0, Math.round(ds.blur)),
    offsetX: Math.round(ds.offsetX),
    offsetY: Math.round(ds.offsetY),
    opacity: clamp(ds.opacity, 0, 1),
  };
}

export function pointerShadowToDropShadow(intensityRaw: number): DropShadowConfig | undefined {
  const intensity = clamp(Number.isFinite(intensityRaw) ? intensityRaw : 0, 0, 1);
  if (intensity <= 0) return undefined;

  return normalizeDropShadowForBake({
    color: '#000000',
    opacity: 0.3 + intensity * 0.6,
    blur: 4 + intensity * 20,
    offsetX: intensity * 4,
    offsetY: intensity * 4,
  });
}

export function pointerEffectPaddingFromIntensity(shadowIntensityRaw: number, glowIntensityRaw: number, trailIntensityRaw: number): number {
  const shadow = pointerShadowToDropShadow(shadowIntensityRaw);
  const shadowPad = shadow ? Math.ceil(shadow.blur + Math.max(Math.abs(shadow.offsetX), Math.abs(shadow.offsetY)) + 2) : 0;
  const glow = clamp(Number.isFinite(glowIntensityRaw) ? glowIntensityRaw : 0, 0, 1);
  const trail = clamp(Number.isFinite(trailIntensityRaw) ? trailIntensityRaw : 0, 0, 1);
  const glowPad = Math.ceil(glow * 20 + 12);
  const trailPad = Math.ceil(trail * 6);
  return Math.max(0, shadowPad, glowPad, trailPad);
}
