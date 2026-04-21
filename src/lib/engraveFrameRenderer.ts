import type { WatchFaceElement } from '@/types';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  cfg: NonNullable<WatchFaceElement['engraveFrame']>,
): void {
  const { x, y, width: w, height: h } = rect;
  const depth = typeof cfg.depth === 'number' ? cfg.depth : 6;

  // Keep export and preview visually aligned while reducing over-crisp edge density on device.
  const blur = depth * 0.95;
  const offsetMag = Math.max(1, depth * 0.5);
  const angle = ((cfg.lightAngle ?? 135) * Math.PI) / 180;
  const offX = Math.cos(angle) * offsetMag;
  const offY = Math.sin(angle) * offsetMag;

  const hiC = cfg.highlightColor ?? '#FFFFFF';
  const hiO = cfg.highlightOpacity ?? 0.6;
  const shC = cfg.shadowColor ?? '#000000';
  const shO = cfg.shadowOpacity ?? 0.6;

  const isEngrave = cfg.mode === 'inner';
  const lightSideColor = hexToRgba(isEngrave ? shC : hiC, isEngrave ? shO : hiO);
  const darkSideColor = hexToRgba(isEngrave ? hiC : shC, isEngrave ? hiO : shO);

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

  const strokeShapePath = (inset = 0) => {
    ctx.beginPath();
    if (shape === 'circle') {
      ctx.arc(x + w / 2, y + h / 2, Math.max(0, (Math.min(w, h) / 2) - inset), 0, Math.PI * 2);
    } else if (shape === 'rounded') {
      const rr = Math.max(0, cr - inset * 0.5);
      ctx.roundRect(x + inset, y + inset, Math.max(0, w - inset * 2), Math.max(0, h - inset * 2), rr);
    } else {
      ctx.rect(x + inset, y + inset, Math.max(0, w - inset * 2), Math.max(0, h - inset * 2));
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

  const drawShadowEdge = (shadowCol: string, ox: number, oy: number) => {
    ctx.save();
    ctx.beginPath();
    makeShapePath();
    ctx.clip();
    ctx.shadowColor = shadowCol;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = ox;
    ctx.shadowOffsetY = oy;
    ctx.fillStyle = shadowCol;
    ctx.fillRect(x - blur - Math.abs(ox) - 2, y - blur - Math.abs(oy) - 2, w + 2 * (blur + Math.abs(ox)) + 4, blur + Math.abs(oy) + 2);
    ctx.fillRect(x - blur - Math.abs(ox) - 2, y + h + 1, w + 2 * (blur + Math.abs(ox)) + 4, blur + Math.abs(oy) + 2);
    ctx.fillRect(x - blur - Math.abs(ox) - 2, y - blur - Math.abs(oy) - 2, blur + Math.abs(ox) + 2, h + 2 * (blur + Math.abs(oy)) + 4);
    ctx.fillRect(x + w + 1, y - blur - Math.abs(oy) - 2, blur + Math.abs(ox) + 2, h + 2 * (blur + Math.abs(oy)) + 4);
    ctx.restore();
  };

  drawShadowEdge(lightSideColor, offX, offY);
  drawShadowEdge(darkSideColor, -offX, -offY);

  const edgePx = Math.max(1, Math.round(depth * 0.24));
  for (let i = 0; i < edgePx; i++) {
    const inset = i + 0.5;
    const alphaFalloff = 1 - i / (edgePx + 1);

    ctx.save();
    strokeShapePath(inset);
    ctx.strokeStyle = hexToRgba(isEngrave ? shC : hiC, (isEngrave ? shO : hiO) * 0.42 * alphaFalloff);
    ctx.lineWidth = 1;
    ctx.shadowColor = 'transparent';
    ctx.stroke();
    ctx.restore();

    ctx.save();
    strokeShapePath(inset);
    ctx.strokeStyle = hexToRgba(isEngrave ? hiC : shC, (isEngrave ? hiO : shO) * 0.36 * alphaFalloff);
    ctx.lineWidth = 1;
    ctx.shadowColor = hexToRgba(isEngrave ? hiC : shC, (isEngrave ? hiO : shO) * 0.28 * alphaFalloff);
    ctx.shadowBlur = 1;
    ctx.shadowOffsetX = -offX * 0.35;
    ctx.shadowOffsetY = -offY * 0.35;
    ctx.stroke();
    ctx.restore();
  }
}
