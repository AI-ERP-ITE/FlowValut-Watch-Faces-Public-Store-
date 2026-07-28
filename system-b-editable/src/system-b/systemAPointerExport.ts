import {
  getCustomHandSourceKind,
  resolveCustomHandPack,
  type CustomHandRecord,
} from '@/lib/customHandStore';
import { bakeDeterministicColorAdjustments } from '@/lib/effectsBakeEngine';
import {
  pointerEffectPaddingFromIntensity,
  pointerShadowToDropShadow,
} from '@/lib/effectNormalization';
import { generateHandSet, type HandStyleKey } from '@/lib/handStyles';
import { normalizePointerEffects } from '@/lib/pointerEffects';
import type { WatchFaceConfig, WatchFaceElement } from '@/types';

async function applyPointerEffectsForZPK(
  dataUrl: string,
  el: WatchFaceElement,
  _layer: 'hour' | 'minute' | 'second' | 'cover' | 'gauge',
): Promise<string> {
  const effects = normalizePointerEffects(el);
  const shadowIntensity = Math.max(0, Math.min(1, el.handShadow ?? 0));
  const pointerShadow = pointerShadowToDropShadow(shadowIntensity);
  const glowIntensity = Math.max(0, Math.min(1, el.handGlow ?? 0));
  const trailIntensity = Math.max(0, Math.min(1, el.handTrail ?? 0));
  const tintColor = el.handTint?.trim();
  const hasBasePointerEffects = effects.brightness === 0
    && effects.contrast === 0
    && effects.saturation === 0
    && effects.hue === 0
    && effects.opacity === 1;
  const hasHandVisualEffects = shadowIntensity > 0 || glowIntensity > 0 || trailIntensity > 0 || !!tintColor;
  const isSvgDataUrl = /^data:image\/svg\+xml/i.test(dataUrl);
  if (hasBasePointerEffects && !hasHandVisualEffects && !isSvgDataUrl) return dataUrl;

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });

  const width = Math.max(1, img.naturalWidth || img.width || 1);
  const height = Math.max(1, img.naturalHeight || img.height || 1);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  const adjustedBase = bakeDeterministicColorAdjustments(img, width, height, {
    brightness: effects.brightness,
    contrast: effects.contrast,
    saturation: effects.saturation,
    hueDeg: effects.hue,
    saturationMode: 'delta',
    opacity: effects.opacity,
  });

  if (trailIntensity > 0) {
    for (let t = 1; t <= 3; t += 1) {
      const trailAlpha = trailIntensity * (0.18 - t * 0.04);
      if (trailAlpha <= 0) break;
      ctx.save();
      ctx.globalAlpha = trailAlpha;
      ctx.drawImage(adjustedBase, 0, -t * 2, width, height);
      ctx.restore();
    }
  }

  ctx.save();
  if (pointerShadow) {
    const hex = pointerShadow.color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    ctx.shadowColor = `rgba(${r},${g},${b},${pointerShadow.opacity})`;
    ctx.shadowBlur = pointerShadow.blur;
    ctx.shadowOffsetX = pointerShadow.offsetX;
    ctx.shadowOffsetY = pointerShadow.offsetY;
  }
  ctx.globalAlpha = 1;
  ctx.drawImage(adjustedBase, 0, 0, width, height);
  ctx.restore();

  if (glowIntensity > 0) {
    const glowColor = tintColor || '#00EEFF';
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = glowIntensity * 0.55;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12 + glowIntensity * 20;
    ctx.drawImage(adjustedBase, 0, 0, width, height);
    ctx.restore();
  }

  if (tintColor) {
    const tintCanvas = document.createElement('canvas');
    tintCanvas.width = width;
    tintCanvas.height = height;
    const tintCtx = tintCanvas.getContext('2d');
    if (tintCtx) {
      tintCtx.drawImage(adjustedBase, 0, 0, width, height);
      tintCtx.globalCompositeOperation = 'source-in';
      tintCtx.globalAlpha = 0.35;
      tintCtx.fillStyle = tintColor;
      tintCtx.fillRect(0, 0, width, height);
      ctx.drawImage(tintCanvas, 0, 0, width, height);
    }
  }

  return canvas.toDataURL('image/png');
}

type PointerLayer = 'hour' | 'minute' | 'second' | 'cover';

const POINTER_BASE_METRICS: Record<PointerLayer, { width: number; height: number; pivotX: number; pivotY: number }> = {
  hour: { width: 22, height: 140, pivotX: 11, pivotY: 118 },
  minute: { width: 16, height: 200, pivotX: 8, pivotY: 172 },
  second: { width: 8, height: 240, pivotX: 4, pivotY: 180 },
  cover: { width: 30, height: 30, pivotX: 15, pivotY: 15 },
};

function clampPointerValue(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function parsePivotRatioFromSource(code?: string): { x: number; y: number } | null {
  if (!code) return null;
  const svg = code.match(/<svg[\s\S]*<\/svg>/i)?.[0] ?? null;
  if (!svg) return null;
  const tag = svg.match(/<svg\b[^>]*>/i)?.[0] ?? '';
  const vb = tag.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1] ?? '';
  const parts = vb.trim().split(/[\s,]+/).map(Number);
  if (parts.length < 4 || parts.some(Number.isNaN) || parts[2] <= 0 || parts[3] <= 0) return null;
  const [minX, minY, w, h] = parts;
  const pxRaw = Number(tag.match(/\bdata-pivot-x\s*=\s*["']([^"']+)["']/i)?.[1]);
  const pyRaw = Number(tag.match(/\bdata-pivot-y\s*=\s*["']([^"']+)["']/i)?.[1]);
  if (Number.isNaN(pxRaw) || Number.isNaN(pyRaw)) return null;
  return {
    x: clampPointerValue((pxRaw - minX) / w, 0, 1),
    y: clampPointerValue((pyRaw - minY) / h, 0, 1),
  };
}

async function preparePointerGeometryForExport(
  dataUrl: string,
  layer: PointerLayer,
  el: WatchFaceElement,
  customHand?: CustomHandRecord,
  sourcePivotRatio?: { x: number; y: number } | null,
): Promise<{ dataUrl: string; pivot?: { x: number; y: number } }> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });

  const width = Math.max(1, img.naturalWidth || img.width || 1);
  const height = Math.max(1, img.naturalHeight || img.height || 1);
  const sourceMode = !!sourcePivotRatio;
  const base = POINTER_BASE_METRICS[layer];

  const globalLen = el.handLengthScale ?? 1;
  const hubScale = (el.handHubScale ?? 1) * globalLen;
  const len = layer === 'hour'
    ? globalLen * (el.handHourLength ?? 1)
    : layer === 'minute'
      ? globalLen * (el.handMinuteLength ?? 1)
      : layer === 'second'
        ? globalLen * (el.handSecondLength ?? 1)
        : hubScale;
  const wid = layer === 'hour'
    ? (el.handHourWidth ?? 1)
    : layer === 'minute'
      ? (el.handMinuteWidth ?? 1)
      : layer === 'second'
        ? (el.handSecondWidth ?? 1)
        : hubScale;

  const baseW = sourceMode ? width : base.width;
  const baseH = sourceMode ? height : base.height;

  let pivotX = base.pivotX;
  let pivotY = base.pivotY;
  if (sourceMode) {
    pivotX = baseW * (sourcePivotRatio?.x ?? 0.5);
    pivotY = baseH * (sourcePivotRatio?.y ?? 0.5);
  } else if (layer === 'hour') {
    pivotX = customHand?.hourPosX ?? base.pivotX;
    pivotY = customHand?.hourPosY ?? base.pivotY;
  } else if (layer === 'minute') {
    pivotX = customHand?.minutePosX ?? base.pivotX;
    pivotY = customHand?.minutePosY ?? base.pivotY;
  } else if (layer === 'second') {
    pivotX = customHand?.secondPosX ?? base.pivotX;
    pivotY = customHand?.secondPosY ?? base.pivotY;
  }

  const targetW = Math.max(1, Math.round(baseW * wid));
  const targetH = Math.max(1, Math.round(baseH * len));
  const drawPivotX = pivotX * wid;
  const drawPivotY = layer === 'cover' ? pivotY : (pivotY / baseH) * targetH;
  const coverW = (el.coverWidth && el.coverWidth > 0) ? el.coverWidth : POINTER_BASE_METRICS.cover.width;
  const coverH = (el.coverHeight && el.coverHeight > 0) ? el.coverHeight : POINTER_BASE_METRICS.cover.height;
  const finalTargetW = layer === 'cover' ? Math.max(1, Math.round(coverW * hubScale)) : targetW;
  const finalTargetH = layer === 'cover' ? Math.max(1, Math.round(coverH * hubScale)) : targetH;
  const finalPivotX = layer === 'cover' ? finalTargetW / 2 : drawPivotX;
  const finalPivotY = layer === 'cover' ? finalTargetH / 2 : drawPivotY;
  const effectPadRaw = pointerEffectPaddingFromIntensity(el.handShadow ?? 0, el.handGlow ?? 0, el.handTrail ?? 0);
  const effectPad = layer === 'cover' ? 0 : effectPadRaw;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl };
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const out = document.createElement('canvas');
  out.width = finalTargetW + effectPad * 2;
  out.height = finalTargetH + effectPad * 2;
  const outCtx = out.getContext('2d');
  if (!outCtx) return { dataUrl };
  outCtx.clearRect(0, 0, out.width, out.height);
  outCtx.drawImage(canvas, 0, 0, width, height, effectPad, effectPad, finalTargetW, finalTargetH);

  const pivot = {
    x: Math.round(clampPointerValue(finalPivotX + effectPad, 0, out.width)),
    y: Math.round(clampPointerValue(finalPivotY + effectPad, 0, out.height)),
  };
  return { dataUrl: out.toDataURL('image/png'), pivot };
}

async function preparePointer(
  element: WatchFaceElement,
  customHands: ReadonlyMap<string, CustomHandRecord>,
): Promise<WatchFaceElement> {
  if (element.type !== 'TIME_POINTER') return structuredClone(element);
  const next = structuredClone(element);
  const customHand = next.handStyle?.startsWith('custom_hand:')
    ? customHands.get(next.handStyle)
    : undefined;
  if (next.handStyle?.startsWith('custom_hand:') && !customHand) {
    throw new Error(`Custom pointer "${next.handStyle}" is unavailable for System A export preparation.`);
  }

  let sources: Record<PointerLayer, string | null>;
  let sourcePivotRatios: Record<PointerLayer, { x: number; y: number }> | null = null;
  if (customHand) {
    if (typeof customHand.coverWidth === 'number' && customHand.coverWidth > 0) next.coverWidth = customHand.coverWidth;
    if (typeof customHand.coverHeight === 'number' && customHand.coverHeight > 0) next.coverHeight = customHand.coverHeight;
    const resolvedPack = resolveCustomHandPack(customHand);
    const sourceMode = resolvedPack?.mode === 'source-based-custom'
      && getCustomHandSourceKind(customHand) === 'html';
    sources = {
      hour: sourceMode ? (resolvedPack?.sources.hour ?? customHand.hourDataUrl) : customHand.hourDataUrl,
      minute: sourceMode ? (resolvedPack?.sources.minute ?? customHand.minuteDataUrl) : customHand.minuteDataUrl,
      second: sourceMode ? (resolvedPack?.sources.second ?? customHand.secondDataUrl) : customHand.secondDataUrl,
      cover: customHand.coverDataUrl ?? resolvedPack?.sources.cover ?? null,
    };
    sourcePivotRatios = sourceMode ? {
      hour: parsePivotRatioFromSource(customHand.sourceHourHtml)
        ?? { x: customHand.hourPivotXRatio ?? 0.5, y: customHand.hourSvgPivotNorm ?? customHand.hourPivotYRatio ?? customHand.hourPivotNorm ?? (customHand.hourPosY ?? 118) / 140 },
      minute: parsePivotRatioFromSource(customHand.sourceMinuteHtml)
        ?? { x: customHand.minutePivotXRatio ?? 0.5, y: customHand.minuteSvgPivotNorm ?? customHand.minutePivotYRatio ?? customHand.minutePivotNorm ?? (customHand.minutePosY ?? 172) / 200 },
      second: parsePivotRatioFromSource(customHand.sourceSecondHtml)
        ?? { x: customHand.secondPivotXRatio ?? 0.5, y: customHand.secondSvgPivotNorm ?? customHand.secondPivotYRatio ?? customHand.secondPivotNorm ?? (customHand.secondPosY ?? 180) / 240 },
      cover: { x: 0.5, y: 0.5 },
    } : null;
  } else {
    const handSet = generateHandSet((next.handStyle ?? 'silver') as HandStyleKey);
    sources = {
      hour: handSet.hourHand,
      minute: handSet.minuteHand,
      second: handSet.secondHand,
      cover: handSet.cover,
    };
  }

  for (const layer of ['hour', 'minute', 'second', 'cover'] as PointerLayer[]) {
    const source = sources[layer];
    if (!source) continue;
    const prepared = await preparePointerGeometryForExport(
      source,
      layer,
      next,
      customHand,
      sourcePivotRatios?.[layer] ?? null,
    );
    const effected = await applyPointerEffectsForZPK(prepared.dataUrl, next, layer);
    if (layer === 'hour') {
      next.hourHandSrc = effected;
      if (prepared.pivot) next.hourPos = prepared.pivot;
    } else if (layer === 'minute') {
      next.minuteHandSrc = effected;
      if (prepared.pivot) next.minutePos = prepared.pivot;
    } else if (layer === 'second') {
      next.secondHandSrc = effected;
      if (prepared.pivot) next.secondPos = prepared.pivot;
    } else {
      next.coverSrc = effected;
    }
  }
  return next;
}

export async function prepareConfigPointersLikeSystemA(
  config: WatchFaceConfig,
  customHands: readonly CustomHandRecord[],
): Promise<WatchFaceConfig> {
  const records = new Map(customHands.map((record) => [record.key, record]));
  return {
    ...structuredClone(config),
    elements: await Promise.all(config.elements.map((element) => preparePointer(element, records))),
    aodElements: config.aodElements
      ? await Promise.all(config.aodElements.map((element) => preparePointer(element, records)))
      : config.aodElements,
  };
}
