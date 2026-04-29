import type { WatchFaceElement } from '@/types';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type EngraveFrameConfig = NonNullable<WatchFaceElement['engraveFrame']>;

function hexToRgba(hex: string, alpha: number): string {
  const safe = (hex || '#000000').replace('#', '').padEnd(6, '0').slice(0, 6);
  const r = parseInt(safe.slice(0, 2), 16) || 0;
  const g = parseInt(safe.slice(2, 4), 16) || 0;
  const b = parseInt(safe.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function renderEngraveFrameEffect(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  cfg: EngraveFrameConfig,
): void {
  const { x, y, width: w, height: h } = rect;
  const depth = typeof cfg.depth === 'number' ? cfg.depth : 6;
  const depthPx = Math.max(1, Math.round(depth));

  // Zepp-parity strategy: deterministic, integer-only edge layering with no browser shadow blur.
  const offsetMag = Math.max(1, Math.round(depth * 0.5));
  const angle = ((cfg.lightAngle ?? 135) * Math.PI) / 180;
  const offX = Math.round(Math.cos(angle) * offsetMag);
  const offY = Math.round(Math.sin(angle) * offsetMag);

  const hiC = cfg.highlightColor ?? '#FFFFFF';
  const hiO = cfg.highlightOpacity ?? 0.6;
  const shC = cfg.shadowColor ?? '#000000';
  const shO = cfg.shadowOpacity ?? 0.6;

  const isEngrave = cfg.mode === 'inner';

  const shape = cfg.shape ?? 'rect';
  const cr = cfg.cornerRadius ?? 12;

  const makeShapePath = () => {
    if (shape === 'circle') {
      ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
    } else if (shape === 'rounded') {
      ctx.roundRect(x, y, w, h, cr);
    } else {
      ctx.rect(x, y, w, h);
    }
  };

  const strokeShapePath = (inset = 0, dx = 0, dy = 0) => {
    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(
        x + w / 2 + dx,
        y + h / 2 + dy,
        Math.max(0, (Math.min(w, h) / 2) - inset),
        0,
        Math.PI * 2,
      );
    } else if (shape === 'rounded') {
      const rr = Math.max(0, cr - inset * 0.5);
      ctx.roundRect(
        x + inset + dx,
        y + inset + dy,
        Math.max(0, w - inset * 2),
        Math.max(0, h - inset * 2),
        rr,
      );
    } else {
      ctx.rect(
        x + inset + dx,
        y + inset + dy,
        Math.max(0, w - inset * 2),
        Math.max(0, h - inset * 2),
      );
    }
  };

  if (cfg.fillMode === 'color') {
    ctx.save();
    ctx.beginPath();
    makeShapePath();
    ctx.fillStyle = cfg.fillColor;
    ctx.fill();
    ctx.restore();
  }

  // Layered integer-step bevel strokes. This keeps preview/export output deterministic.
  for (let i = 0; i < depthPx; i++) {
    const inset = i + 0.5;
    const falloff = 1 - i / (depthPx + 1);
    const lightAlpha = Math.max(0, Math.min(1, (isEngrave ? shO : hiO) * 0.55 * falloff));
    const darkAlpha = Math.max(0, Math.min(1, (isEngrave ? hiO : shO) * 0.52 * falloff));

    ctx.save();
    ctx.beginPath();
    makeShapePath();
    ctx.clip();
    strokeShapePath(inset, offX, offY);
    ctx.strokeStyle = hexToRgba(isEngrave ? shC : hiC, lightAlpha);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    makeShapePath();
    ctx.clip();
    strokeShapePath(inset, -offX, -offY);
    ctx.strokeStyle = hexToRgba(isEngrave ? hiC : shC, darkAlpha);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Keep preview and export aligned with the same edge-strength compensation.
 */
export function normalizeEngraveFrameForParity(cfg: EngraveFrameConfig): EngraveFrameConfig {
  return {
    ...cfg,
    depth: Math.max(1, (cfg.depth ?? 6) * 0.68),
    highlightOpacity: Math.max(0, Math.min(1, (cfg.highlightOpacity ?? 0.6) * 0.72)),
    shadowOpacity: Math.max(0, Math.min(1, (cfg.shadowOpacity ?? 0.6) * 0.72)),
  };
}
