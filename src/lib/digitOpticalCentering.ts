export type DigitCenterMode = 'auto' | 'alpha' | 'bbox' | 'pixel' | 'blend';

export interface DigitInkMetrics {
  hasInk: boolean;
  targetX: number;
  targetY: number;
  opticalCenterX: number;
  opticalCenterY: number;
  bboxCenterX: number;
  bboxCenterY: number;
  alphaCentroidX: number;
  alphaCentroidY: number;
  pixelCentroidX: number;
  pixelCentroidY: number;
  offsetToTargetX: number;
  offsetToTargetY: number;
}

export interface DigitCenteringOptions {
  mode?: DigitCenterMode;
  xMode?: Exclude<DigitCenterMode, 'auto'>;
  yMode?: Exclude<DigitCenterMode, 'auto'>;
  xBlendAlphaWeight?: number;
  yBlendAlphaWeight?: number;
  xBiasPx?: number;
  yBiasPx?: number;
  thresholdPxX?: number;
  thresholdPxY?: number;
  maxIterations?: number;
  debug?: boolean;
  debugTag?: string;
}

export interface DigitCenteringResult {
  iterations: number;
  finalDrawX: number;
  finalDrawY: number;
  metrics: DigitInkMetrics;
}

function measureInkMetrics(ctx: CanvasRenderingContext2D, width: number, height: number): DigitInkMetrics {
  const imageData = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let alphaWeightSum = 0;
  let alphaWeightedX = 0;
  let alphaWeightedY = 0;
  let pixelCount = 0;
  let pixelXSum = 0;
  let pixelYSum = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = imageData[idx + 3];
      if (a <= 0) continue;
      const xCenter = x + 0.5;
      const yCenter = y + 0.5;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      pixelCount += 1;
      pixelXSum += xCenter;
      pixelYSum += yCenter;
      alphaWeightSum += a;
      alphaWeightedX += xCenter * a;
      alphaWeightedY += yCenter * a;
    }
  }

  const targetX = width / 2;
  const targetY = height / 2;
  if (pixelCount === 0 || alphaWeightSum === 0) {
    return {
      hasInk: false,
      targetX,
      targetY,
      opticalCenterX: targetX,
      opticalCenterY: targetY,
      bboxCenterX: targetX,
      bboxCenterY: targetY,
      alphaCentroidX: targetX,
      alphaCentroidY: targetY,
      pixelCentroidX: targetX,
      pixelCentroidY: targetY,
      offsetToTargetX: 0,
      offsetToTargetY: 0,
    };
  }

  const bboxCenterX = (minX + maxX + 1) / 2;
  const bboxCenterY = (minY + maxY + 1) / 2;
  const alphaCentroidX = alphaWeightedX / alphaWeightSum;
  const alphaCentroidY = alphaWeightedY / alphaWeightSum;
  const pixelCentroidX = pixelXSum / pixelCount;
  const pixelCentroidY = pixelYSum / pixelCount;
  // Defaults are resolved in drawOpticallyCenteredDigit based on mode.
  const opticalCenterX = alphaCentroidX;
  const opticalCenterY = alphaCentroidY;
  return {
    hasInk: true,
    targetX,
    targetY,
    opticalCenterX,
    opticalCenterY,
    bboxCenterX,
    bboxCenterY,
    alphaCentroidX,
    alphaCentroidY,
    pixelCentroidX,
    pixelCentroidY,
    offsetToTargetX: targetX - opticalCenterX,
    offsetToTargetY: targetY - opticalCenterY,
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function pickCenter(
  mode: Exclude<DigitCenterMode, 'auto'>,
  bbox: number,
  alpha: number,
  pixel: number,
  alphaWeight: number,
): number {
  switch (mode) {
    case 'bbox':
      return bbox;
    case 'pixel':
      return pixel;
    case 'blend': {
      const w = clamp01(alphaWeight);
      return alpha * w + bbox * (1 - w);
    }
    case 'alpha':
    default:
      return alpha;
  }
}

export function drawOpticallyCenteredDigit(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  digit: string,
  color: string,
  font: string,
  options?: DigitCenteringOptions,
): DigitCenteringResult {
  const mode = options?.mode ?? 'auto';
  const resolvedXMode: Exclude<DigitCenterMode, 'auto'> = mode === 'auto' ? 'blend' : (options?.xMode ?? mode);
  const resolvedYMode: Exclude<DigitCenterMode, 'auto'> = mode === 'auto' ? 'alpha' : (options?.yMode ?? mode);
  // Auto policy tuned for watchface digits: X uses visual-mass dominant blend, Y uses alpha center.
  const xBlendAlphaWeight = options?.xBlendAlphaWeight ?? (mode === 'auto' ? 0.65 : 0.7);
  const yBlendAlphaWeight = options?.yBlendAlphaWeight ?? 0.6;
  const xBiasPx = options?.xBiasPx ?? 0;
  const yBiasPx = options?.yBiasPx ?? 0;
  const thresholdPxX = options?.thresholdPxX ?? 0.25;
  const thresholdPxY = options?.thresholdPxY ?? 0.25;
  const maxIterations = options?.maxIterations ?? 3;
  const debug = options?.debug ?? false;
  const debugTag = options?.debugTag ?? 'digit';

  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let drawX = width / 2;
  let drawY = height / 2;
  let metrics!: DigitInkMetrics;
  let iterations = 0;

  for (let i = 0; i < maxIterations; i++) {
    iterations = i + 1;
    ctx.clearRect(0, 0, width, height);
    ctx.fillText(digit, drawX, drawY);
    metrics = measureInkMetrics(ctx, width, height);

    if (!metrics.hasInk) break;

    const centerX = pickCenter(
      resolvedXMode,
      metrics.bboxCenterX,
      metrics.alphaCentroidX,
      metrics.pixelCentroidX,
      xBlendAlphaWeight,
    );
    const centerY = pickCenter(
      resolvedYMode,
      metrics.bboxCenterY,
      metrics.alphaCentroidY,
      metrics.pixelCentroidY,
      yBlendAlphaWeight,
    );
    const offsetToTargetX = metrics.targetX + xBiasPx - centerX;
    const offsetToTargetY = metrics.targetY + yBiasPx - centerY;

    metrics.opticalCenterX = centerX;
    metrics.opticalCenterY = centerY;
    metrics.offsetToTargetX = offsetToTargetX;
    metrics.offsetToTargetY = offsetToTargetY;

    if (debug) {
      console.log('[DigitCenter]', debugTag, {
        iteration: iterations,
        width,
        height,
        drawX,
        drawY,
        opticalCenterX: metrics.opticalCenterX,
        bboxCenterX: metrics.bboxCenterX,
        bboxCenterY: metrics.bboxCenterY,
        alphaCentroidX: metrics.alphaCentroidX,
        alphaCentroidY: metrics.alphaCentroidY,
        offsetToTargetX: metrics.offsetToTargetX,
        offsetToTargetY: metrics.offsetToTargetY,
      });
    }

    if (Math.abs(metrics.offsetToTargetX) <= thresholdPxX && Math.abs(metrics.offsetToTargetY) <= thresholdPxY) break;
    drawX += metrics.offsetToTargetX;
    drawY += metrics.offsetToTargetY;
  }

  return {
    iterations,
    finalDrawX: drawX,
    finalDrawY: drawY,
    metrics,
  };
}
