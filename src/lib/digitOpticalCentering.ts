export interface DigitInkMetrics {
  hasInk: boolean;
  targetX: number;
  targetY: number;
  opticalCenterX: number;
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
  // Horizontal optical center uses a bbox-heavy blend to avoid anti-aliased edge bias
  // that can make numerals appear slightly left-shifted on device.
  const opticalCenterX = bboxCenterX * 0.7 + alphaCentroidX * 0.3;
  return {
    hasInk: true,
    targetX,
    targetY,
    opticalCenterX,
    bboxCenterX,
    bboxCenterY,
    alphaCentroidX,
    alphaCentroidY,
    pixelCentroidX,
    pixelCentroidY,
    offsetToTargetX: targetX - opticalCenterX,
    offsetToTargetY: targetY - alphaCentroidY,
  };
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
  const thresholdPxX = options?.thresholdPxX ?? 0.15;
  const thresholdPxY = options?.thresholdPxY ?? 0.15;
  const maxIterations = options?.maxIterations ?? 3;
  const debug = options?.debug ?? false;
  const debugTag = options?.debugTag ?? 'digit';

  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let drawX = width / 2;
  let drawY = height / 2;
  let metrics = measureInkMetrics(ctx, width, height);
  let iterations = 0;

  for (let i = 0; i < maxIterations; i++) {
    iterations = i + 1;
    ctx.clearRect(0, 0, width, height);
    ctx.fillText(digit, drawX, drawY);
    metrics = measureInkMetrics(ctx, width, height);

    if (!metrics.hasInk) break;
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
