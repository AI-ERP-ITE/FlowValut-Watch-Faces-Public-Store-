import type { WatchFaceElement } from '@/types';

export type DropShadowConfig = NonNullable<WatchFaceElement['dropShadow']>;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const normalized = (hex || '#000000').replace('#', '').padStart(6, '0').slice(0, 6);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16) || 0,
    g: Number.parseInt(normalized.slice(2, 4), 16) || 0,
    b: Number.parseInt(normalized.slice(4, 6), 16) || 0,
  };
}

function toHexColor(r: number, g: number, b: number): string {
  const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function quantizeShadowChannel(v: number): number {
  // Zepp previews frequently diverge on low channel values; quantize and lift low non-zero values.
  const q = Math.round(v / 8) * 8;
  if (q > 0 && q < 47) return 47;
  return clamp(q, 0, 255);
}

function normalizeShadowColorForDevice(hex: string): string {
  const rgb = parseHexColor(hex);
  return toHexColor(
    quantizeShadowChannel(rgb.r),
    quantizeShadowChannel(rgb.g),
    quantizeShadowChannel(rgb.b),
  );
}

export function normalizeDropShadowForBake(ds: DropShadowConfig): DropShadowConfig {
  return {
    ...ds,
    color: normalizeShadowColorForDevice(ds.color),
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
