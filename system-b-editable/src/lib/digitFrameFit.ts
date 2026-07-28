import type { HorizontalDigitAlign } from './digitAlignment';

export interface DigitFrameBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DigitFrameFitRequest {
  bounds: DigitFrameBounds;
  contentWidth: number;
  contentHeight: number;
  alignH: HorizontalDigitAlign;
  paddingX?: number;
  paddingY?: number;
}

function finiteNonNegative(value: number | undefined): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

/**
 * Fits a digit widget frame without changing typography or mutating the input bounds.
 * Horizontal placement preserves the anchor implied by alignH. The top Y anchor stays fixed,
 * matching Zepp digit widget start-coordinate semantics.
 */
export function fitDigitFrameToContent(request: DigitFrameFitRequest): DigitFrameBounds {
  const original = request.bounds;
  const paddingX = finiteNonNegative(request.paddingX);
  const paddingY = finiteNonNegative(request.paddingY);
  const width = Math.max(1, Math.ceil(finiteNonNegative(request.contentWidth) + paddingX * 2));
  const height = Math.max(1, Math.ceil(finiteNonNegative(request.contentHeight) + paddingY * 2));

  const leftAnchor = original.x;
  const centerAnchor = original.x + original.width / 2;
  const rightAnchor = original.x + original.width;
  const x = request.alignH === 'CENTER_H'
    ? Math.round(centerAnchor - width / 2)
    : request.alignH === 'RIGHT'
      ? Math.round(rightAnchor - width)
      : Math.round(leftAnchor);

  return {
    x,
    y: Math.round(original.y),
    width,
    height,
  };
}

