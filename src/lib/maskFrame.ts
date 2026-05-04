/**
 * Spec 074 — shared mask coordinate frame helper.
 *
 * Single source of truth for mapping between:
 *   - mask "local" space        : [0,100] × [0,100]   (origin = element center, %)
 *   - element-local pixel frame : [-W/2,+W/2] × [-H/2,+H/2]   (origin-centered)
 *   - canvas % space            : [0,100] × [0,100]   (origin = top-left of canvas, %)
 *
 * Used by:
 *   - SVG renderer (engine/core/renderer.js — see maskFrame.js mirror)
 *   - Editor preview overlay (ParametricPage.tsx)
 *   - Document-load migration of legacy `coordinateSpace:'global'` strokes
 *
 * Pure functions. NaN-safe: invalid inputs yield `null`, callers must drop.
 */

export type LayoutMetrics = { width: number; height: number };

export type MaskFrame = {
  width: number;
  height: number;
  originX: number; // -W/2
  originY: number; // -H/2
};

export type ElementMaskTransform = {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  rotation: number; // degrees
};

export type Point = { x: number; y: number };

/** Build the origin-centered local pixel frame for an element. */
export function getMaskFrame(layoutMetrics: LayoutMetrics | null | undefined): MaskFrame {
  const w = Math.max(1, Number(layoutMetrics?.width) || 1);
  const h = Math.max(1, Number(layoutMetrics?.height) || 1);
  return { width: w, height: h, originX: -w / 2, originY: -h / 2 };
}

/**
 * Map a mask-local % point [0,100] to element-local pixel coordinates [-W/2,+W/2].
 * Returns `null` when the input is non-finite.
 */
export function mapLocalPointToFrame(
  point: Point | null | undefined,
  frame: MaskFrame,
): { px: number; py: number } | null {
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

/**
 * Map a canvas % point [0,100] to mask-local % [0,100] for the given element transform.
 * Rotation-aware. Clamps output to [0,100].
 */
export function mapCanvasPointToLocal(
  canvasPoint: Point | null | undefined,
  transform: ElementMaskTransform,
): Point {
  const xPct = clampPct(Number(canvasPoint?.x));
  const yPct = clampPct(Number(canvasPoint?.y));
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

/**
 * Inverse of `mapCanvasPointToLocal`.
 * Map a mask-local % point [0,100] back to canvas % [0,100].
 */
export function mapLocalPointToCanvas(
  localPoint: Point | null | undefined,
  transform: ElementMaskTransform,
): Point {
  const xPct = clampPct(Number(localPoint?.x));
  const yPct = clampPct(Number(localPoint?.y));
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

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}
