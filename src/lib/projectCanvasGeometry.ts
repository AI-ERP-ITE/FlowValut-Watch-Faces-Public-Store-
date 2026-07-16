import type { WatchFaceConfig, WatchFaceElement } from '@/types';

export interface CanvasResolution {
  width: number;
  height: number;
}

export function isValidCanvasResolution(value: unknown): value is CanvasResolution {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CanvasResolution>;
  return Number.isFinite(candidate.width)
    && Number.isFinite(candidate.height)
    && Number(candidate.width) > 0
    && Number(candidate.height) > 0;
}

export function canvasResolutionsMatch(a: CanvasResolution, b: CanvasResolution): boolean {
  return a.width === b.width && a.height === b.height;
}

function scaleCoordinate(value: number, sourceSize: number, targetSize: number): number {
  return (value / sourceSize) * targetSize;
}

function horizontalAnchorFraction(element: WatchFaceElement): number {
  const align = String(element.alignH ?? '').trim().toUpperCase();
  if (align === 'LEFT') return 0;
  if (align === 'RIGHT') return 1;
  return 0.5;
}

const SAFE_LAYOUT_METRIC_TYPES = new Set<WatchFaceElement['type']>([
  'TEXT',
  'TEXT_IMG',
  'IMG_TIME',
  'IMG_DATE',
  'IMG_WEEK',
  'ARC_PROGRESS',
  'CIRCLE',
  'FILL_RECT',
  'STROKE_RECT',
]);

function isFullCanvasBounds(element: WatchFaceElement, source: CanvasResolution): boolean {
  return element.bounds.x === 0
    && element.bounds.y === 0
    && element.bounds.width === source.width
    && element.bounds.height === source.height;
}

/**
 * Rearrange the project-space shell around an already-created element.
 * Specialized engines and asset-local geometry are never invoked or reinterpreted here.
 */
export function rearrangeElementPosition(
  element: WatchFaceElement,
  source: CanvasResolution,
  target: CanvasResolution,
): WatchFaceElement {
  if (canvasResolutionsMatch(source, target)) return element;

  const scaleX = target.width / source.width;
  const scaleY = target.height / source.height;
  const sizeScale = Math.min(scaleX, scaleY);
  const isBackground = element.name === 'Background';
  const shouldScaleLayoutMetrics = SAFE_LAYOUT_METRIC_TYPES.has(element.type);
  // Legacy non-480 projects were sometimes edited on the old fixed 480 canvas.
  // A full target-sized pointer shell is therefore already in target project space.
  const pointerAlreadyUsesTargetCanvas = element.type === 'TIME_POINTER'
    && isFullCanvasBounds(element, target);
  const shouldUseTargetCanvasBounds = isBackground
    || (element.type === 'TIME_POINTER' && (
      isFullCanvasBounds(element, source)
      || pointerAlreadyUsesTargetCanvas
    ));

  const nextWidth = shouldUseTargetCanvasBounds
    ? target.width
    : element.bounds.width * sizeScale;
  const nextHeight = shouldUseTargetCanvasBounds
    ? target.height
    : element.bounds.height * sizeScale;

  const xFraction = horizontalAnchorFraction(element);
  const yFraction = 0.5;
  const anchorX = element.bounds.x + element.bounds.width * xFraction;
  const anchorY = element.bounds.y + element.bounds.height * yFraction;
  const nextX = shouldUseTargetCanvasBounds
    ? 0
    : scaleCoordinate(anchorX, source.width, target.width) - nextWidth * xFraction;
  const nextY = shouldUseTargetCanvasBounds
    ? 0
    : scaleCoordinate(anchorY, source.height, target.height) - nextHeight * yFraction;

  const sourceCenter = element.type === 'TIME_POINTER' && !element.center
    ? pointerAlreadyUsesTargetCanvas
      ? { x: target.width / 2, y: target.height / 2 }
      : { x: source.width / 2, y: source.height / 2 }
    : element.center;

  return {
    ...element,
    bounds: {
      ...element.bounds,
      x: nextX,
      y: nextY,
      width: nextWidth,
      height: nextHeight,
    },
    ...(sourceCenter
      ? {
          center: {
            x: pointerAlreadyUsesTargetCanvas
              ? sourceCenter.x
              : scaleCoordinate(sourceCenter.x, source.width, target.width),
            y: pointerAlreadyUsesTargetCanvas
              ? sourceCenter.y
              : scaleCoordinate(sourceCenter.y, source.height, target.height),
          },
        }
      : {}),
    ...(element.pointerCenter
      ? {
          pointerCenter: {
            x: pointerAlreadyUsesTargetCanvas
              ? element.pointerCenter.x
              : scaleCoordinate(element.pointerCenter.x, source.width, target.width),
            y: pointerAlreadyUsesTargetCanvas
              ? element.pointerCenter.y
              : scaleCoordinate(element.pointerCenter.y, source.height, target.height),
          },
        }
      : {}),
    ...(shouldScaleLayoutMetrics && element.fontSize !== undefined
      ? { fontSize: element.fontSize * sizeScale }
      : {}),
    ...(shouldScaleLayoutMetrics && element.radius !== undefined
      ? { radius: element.radius * sizeScale }
      : {}),
    ...(shouldScaleLayoutMetrics && element.lineWidth !== undefined
      ? { lineWidth: element.lineWidth * sizeScale }
      : {}),
    ...(shouldScaleLayoutMetrics && element.shapeCornerRadius !== undefined
      ? { shapeCornerRadius: element.shapeCornerRadius * sizeScale }
      : {}),
    ...(shouldScaleLayoutMetrics && element.hSpace !== undefined
      ? { hSpace: element.hSpace * sizeScale }
      : {}),
    ...(element.layoutStartX !== undefined ? { layoutStartX: undefined } : {}),
  };
}

/** Clone and rearrange MAIN/AOD project-space positions, then adopt the target canvas. */
export function rearrangeProjectPositions(
  config: WatchFaceConfig,
  target: CanvasResolution,
  targetWatchModel?: string,
): WatchFaceConfig {
  const source = config.resolution;
  if (!isValidCanvasResolution(source) || !isValidCanvasResolution(target)) return structuredClone(config);
  if (canvasResolutionsMatch(source, target)) return structuredClone(config);

  return {
    ...config,
    resolution: { ...target },
    ...(targetWatchModel ? { watchModel: targetWatchModel } : {}),
    elements: config.elements.map((element) => rearrangeElementPosition(element, source, target)),
    aodElements: config.aodElements
      ? config.aodElements.map((element) => rearrangeElementPosition(element, source, target))
      : config.aodElements,
  };
}

export function isProjectBackgroundElement(
  element: WatchFaceElement,
  resolution: CanvasResolution,
): boolean {
  if (element.gaugePairId) return false;
  if (element.name === 'Background') return true;
  return element.type === 'IMG'
    && element.bounds.x === 0
    && element.bounds.y === 0
    && element.bounds.width === resolution.width
    && element.bounds.height === resolution.height;
}
