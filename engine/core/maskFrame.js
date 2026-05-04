/**
 * Spec 074 — shared mask coordinate frame helper (engine mirror).
 * Mirrors app/src/lib/maskFrame.ts. Keep semantics identical.
 *
 * Origin-centered local pixel frame:
 *   width, height, originX = -W/2, originY = -H/2
 *
 * mapLocalPointToFrame: mask-local % [0,100] → element-local px [-W/2,+W/2]
 *   returns null on non-finite input (caller drops).
 */

export function getMaskFrame(layoutMetrics) {
  const w = Math.max(1, Number(layoutMetrics && layoutMetrics.width) || 1);
  const h = Math.max(1, Number(layoutMetrics && layoutMetrics.height) || 1);
  return { width: w, height: h, originX: -w / 2, originY: -h / 2 };
}

export function mapLocalPointToFrame(point, frame) {
  if (!point) return null;
  if (point.x === null || point.x === undefined) return null;
  if (point.y === null || point.y === undefined) return null;
  const x = Number(point.x);
  const y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    px: (x / 100) * frame.width - frame.width / 2,
    py: (y / 100) * frame.height - frame.height / 2,
  };
}

export function mapCanvasPointToLocal(canvasPoint, transform) {
  const xPct = clampPct(Number(canvasPoint && canvasPoint.x));
  const yPct = clampPct(Number(canvasPoint && canvasPoint.y));
  const worldX = (xPct / 100) * transform.width;
  const worldY = (yPct / 100) * transform.height;
  const dx = worldX - transform.centerX;
  const dy = worldY - transform.centerY;
  const rad = (-(transform.rotation || 0) * Math.PI) / 180;
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
  return {
    x: clampPct(((lx / transform.width) * 100) + 50),
    y: clampPct(((ly / transform.height) * 100) + 50),
  };
}

export function mapLocalPointToCanvas(localPoint, transform) {
  const xPct = clampPct(Number(localPoint && localPoint.x));
  const yPct = clampPct(Number(localPoint && localPoint.y));
  const lx = ((xPct - 50) / 100) * transform.width;
  const ly = ((yPct - 50) / 100) * transform.height;
  const rad = ((transform.rotation || 0) * Math.PI) / 180;
  const wx = transform.centerX + (lx * Math.cos(rad) - ly * Math.sin(rad));
  const wy = transform.centerY + (lx * Math.sin(rad) + ly * Math.cos(rad));
  return {
    x: clampPct((wx / transform.width) * 100),
    y: clampPct((wy / transform.height) * 100),
  };
}

function clampPct(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}
