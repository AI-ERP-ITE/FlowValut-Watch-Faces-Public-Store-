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

/**
 * Reposition one element for a new project canvas without resizing its artwork.
 * TIME_POINTER owns a separate canvas-relative geometry pipeline and is deliberately excluded.
 */
export function rearrangeElementPosition(
  element: WatchFaceElement,
  source: CanvasResolution,
  target: CanvasResolution,
): WatchFaceElement {
  if (element.type === 'TIME_POINTER' || canvasResolutionsMatch(source, target)) return element;

  const xFraction = horizontalAnchorFraction(element);
  const yFraction = 0.5;
  const anchorX = element.bounds.x + element.bounds.width * xFraction;
  const anchorY = element.bounds.y + element.bounds.height * yFraction;
  const nextX = scaleCoordinate(anchorX, source.width, target.width) - element.bounds.width * xFraction;
  const nextY = scaleCoordinate(anchorY, source.height, target.height) - element.bounds.height * yFraction;

  return {
    ...element,
    bounds: {
      ...element.bounds,
      x: nextX,
      y: nextY,
    },
    ...(element.center
      ? {
          center: {
            x: scaleCoordinate(element.center.x, source.width, target.width),
            y: scaleCoordinate(element.center.y, source.height, target.height),
          },
        }
      : {}),
    ...(element.layoutStartX !== undefined ? { layoutStartX: undefined } : {}),
  };
}

/** Clone and rearrange MAIN/AOD project-space positions, then adopt the target canvas. */
export function rearrangeProjectPositions(
  config: WatchFaceConfig,
  target: CanvasResolution,
): WatchFaceConfig {
  const source = config.resolution;
  if (!isValidCanvasResolution(source) || !isValidCanvasResolution(target)) return structuredClone(config);
  if (canvasResolutionsMatch(source, target)) return structuredClone(config);

  return {
    ...config,
    resolution: { ...target },
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
