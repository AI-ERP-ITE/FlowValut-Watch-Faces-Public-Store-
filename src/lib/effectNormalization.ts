import type { WatchFaceElement } from '@/types';

export type DropShadowConfig = NonNullable<WatchFaceElement['dropShadow']>;

export type DepthEffectRecord = {
  enabled: boolean;
  intensity: number;
  angle: number;
  distance: number;
  falloff: number;
  whiteBalance: number;
  spread: number;
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function clampWithFallback(v: number, min: number, max: number, fallback: number): number {
  const safe = Number.isFinite(v) ? v : fallback;
  return clamp(safe, min, max);
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
  const blur = clamp(ds.blur, 0, 20);
  const spread = clamp(Number.isFinite(Number(ds.spread)) ? Number(ds.spread) : 0, 0, 1);
  const offsetX = clamp(ds.offsetX, -20, 20);
  const offsetY = clamp(ds.offsetY, -20, 20);
  const round3 = (value: number) => Math.round(value * 1000) / 1000;
  return {
    ...ds,
    color: normalizeShadowColorForDevice(ds.color),
    blur: round3(blur),
    spread: round3(spread),
    offsetX: round3(offsetX),
    offsetY: round3(offsetY),
    opacity: clamp(ds.opacity, 0, 1),
  };
}

export function dropShadowPaddingForBake(ds: DropShadowConfig): number {
  const normalized = normalizeDropShadowForBake(ds);
  return normalized.blur + (Number.isFinite(Number(normalized.spread)) ? Number(normalized.spread) : 0) + Math.max(Math.abs(normalized.offsetX), Math.abs(normalized.offsetY)) + 4;
}

export function normalizeDepthEffectRecord(
  source: Record<string, unknown> | null | undefined,
  fallback: Partial<DepthEffectRecord> = {},
): Record<string, unknown> {
  const src = source && typeof source === 'object' ? source : {};
  const base: DepthEffectRecord = {
    enabled: fallback.enabled === true,
    intensity: clamp(Number(fallback.intensity ?? 0.46), 0, 1),
    angle: Number.isFinite(Number(fallback.angle)) ? Number(fallback.angle) : -35,
    distance: clamp(Number(fallback.distance ?? 1.2), 0, 6),
    falloff: clamp(Number(fallback.falloff ?? 1), 0.2, 3),
    whiteBalance: clamp(Number(fallback.whiteBalance ?? 0), -1, 1),
    spread: clamp(Number(fallback.spread ?? 0), 0, 1),
  };

  return {
    ...src,
    enabled: src.enabled === true,
    intensity: clampWithFallback(Number(src.intensity), 0, 1, base.intensity),
    angle: Number.isFinite(Number(src.angle)) ? Number(src.angle) : base.angle,
    distance: clampWithFallback(Number(src.distance), 0, 6, base.distance),
    falloff: clampWithFallback(Number(src.falloff), 0.2, 3, base.falloff),
    whiteBalance: clampWithFallback(Number(src.whiteBalance), -1, 1, base.whiteBalance),
    spread: clampWithFallback(Number(src.spread), 0, 1, base.spread),
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
