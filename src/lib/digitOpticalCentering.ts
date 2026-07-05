export interface DigitInkMetrics {
  hasInk: boolean;
  targetX: number;
  bboxCenterX: number;
  alphaCentroidX: number;
  pixelCentroidX: number;
  offsetToTargetX: number;
}

export interface DigitCenteringOptions {
  thresholdPx?: number;
  maxIterations?: number;
  debug?: boolean;
  debugTag?: string;
}

export interface DigitCenteringResult {
  iterations: number;
  finalDrawX: number;
  metrics: DigitInkMetrics;
}

function measureInkMetrics(ctx: CanvasRenderingContext2D, width: number, height: number): DigitInkMetrics {
  const imageData = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let maxX = -1;
  let alphaWeightSum = 0;
  let alphaWeightedX = 0;
  let pixelCount = 0;
  let pixelXSum = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = imageData[idx + 3];
      if (a <= 0) continue;
      const xCenter = x + 0.5;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      pixelCount += 1;
      pixelXSum += xCenter;
      alphaWeightSum += a;
      alphaWeightedX += xCenter * a;
    }
  }

  const targetX = width / 2;
  if (pixelCount === 0 || alphaWeightSum === 0) {
    return {
      hasInk: false,
      targetX,
      bboxCenterX: targetX,
      alphaCentroidX: targetX,
      pixelCentroidX: targetX,
      offsetToTargetX: 0,
    };
  }

  const bboxCenterX = (minX + maxX + 1) / 2;
  const alphaCentroidX = alphaWeightedX / alphaWeightSum;
  const pixelCentroidX = pixelXSum / pixelCount;
  return {
    hasInk: true,
    targetX,
    bboxCenterX,
    alphaCentroidX,
    pixelCentroidX,
    offsetToTargetX: targetX - alphaCentroidX,
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
  const thresholdPx = options?.thresholdPx ?? 0.15;
  const maxIterations = options?.maxIterations ?? 3;
  const debug = options?.debug ?? false;
  const debugTag = options?.debugTag ?? 'digit';

  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let drawX = width / 2;
  let metrics = measureInkMetrics(ctx, width, height);
  let iterations = 0;

  for (let i = 0; i < maxIterations; i++) {
    iterations = i + 1;
    ctx.clearRect(0, 0, width, height);
    ctx.fillText(digit, drawX, height / 2);
    metrics = measureInkMetrics(ctx, width, height);

    if (!metrics.hasInk) break;
    if (debug) {
      console.log('[DigitCenter]', debugTag, {
        iteration: iterations,
        width,
        height,
        drawX,
        bboxCenterX: metrics.bboxCenterX,
        alphaCentroidX: metrics.alphaCentroidX,
        offsetToTargetX: metrics.offsetToTargetX,
      });
    }

    if (Math.abs(metrics.offsetToTargetX) <= thresholdPx) break;
    drawX += metrics.offsetToTargetX;
  }

  return {
    iterations,
    finalDrawX: drawX,
    metrics,
  };
}
