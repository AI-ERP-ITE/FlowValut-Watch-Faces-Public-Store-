export interface VisualFidelityMetrics {
  pixelSimilarity: number;
  edgeSimilarity: number;
  colorSimilarity: number;
  score: number;
}

export interface VisualFidelityResult {
  pass: boolean;
  threshold: number;
  width: number;
  height: number;
  metrics: VisualFidelityMetrics;
}

interface CompareInput {
  sourceDataUrl: string;
  renderedSvg: string;
  width: number;
  height: number;
  threshold?: number;
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for fidelity check.'));
    img.src = src;
  });
}

function toSvgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function drawToImageData(src: string, width: number, height: number): Promise<ImageData> {
  return loadImage(src).then((img) => {
    const canvas = makeCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable for fidelity check.');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  });
}

function grayscale(r: number, g: number, b: number): number {
  return r * 0.299 + g * 0.587 + b * 0.114;
}

function computePixelSimilarity(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let total = 0;
  const pxCount = a.length / 4;
  for (let i = 0; i < a.length; i += 4) {
    total += Math.abs(a[i] - b[i]);
    total += Math.abs(a[i + 1] - b[i + 1]);
    total += Math.abs(a[i + 2] - b[i + 2]);
  }
  const max = pxCount * 255 * 3;
  return clamp01(1 - total / max);
}

function computeGrayscaleBuffer(data: Uint8ClampedArray): Float32Array {
  const out = new Float32Array(data.length / 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    out[j] = grayscale(data[i], data[i + 1], data[i + 2]);
  }
  return out;
}

function computeEdgeMagnitude(gray: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(gray.length);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const gx =
        -gray[i - width - 1] + gray[i - width + 1] +
        -2 * gray[i - 1] + 2 * gray[i + 1] +
        -gray[i + width - 1] + gray[i + width + 1];
      const gy =
        -gray[i - width - 1] - 2 * gray[i - width] - gray[i - width + 1] +
        gray[i + width - 1] + 2 * gray[i + width] + gray[i + width + 1];
      out[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return out;
}

function computeEdgeSimilarity(a: Uint8ClampedArray, b: Uint8ClampedArray, width: number, height: number): number {
  const edgeA = computeEdgeMagnitude(computeGrayscaleBuffer(a), width, height);
  const edgeB = computeEdgeMagnitude(computeGrayscaleBuffer(b), width, height);
  let diff = 0;
  let max = 0;
  for (let i = 0; i < edgeA.length; i += 1) {
    diff += Math.abs(edgeA[i] - edgeB[i]);
    max += Math.max(edgeA[i], edgeB[i]);
  }
  if (max <= 1e-6) return 1;
  return clamp01(1 - diff / max);
}

function computeColorSimilarity(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  const bins = 16;
  const histA = new Float32Array(bins * 3);
  const histB = new Float32Array(bins * 3);
  for (let i = 0; i < a.length; i += 4) {
    const ra = Math.min(bins - 1, Math.floor((a[i] / 256) * bins));
    const ga = Math.min(bins - 1, Math.floor((a[i + 1] / 256) * bins));
    const ba = Math.min(bins - 1, Math.floor((a[i + 2] / 256) * bins));
    const rb = Math.min(bins - 1, Math.floor((b[i] / 256) * bins));
    const gb = Math.min(bins - 1, Math.floor((b[i + 1] / 256) * bins));
    const bb = Math.min(bins - 1, Math.floor((b[i + 2] / 256) * bins));
    histA[ra] += 1;
    histA[bins + ga] += 1;
    histA[bins * 2 + ba] += 1;
    histB[rb] += 1;
    histB[bins + gb] += 1;
    histB[bins * 2 + bb] += 1;
  }

  let l1 = 0;
  let total = 0;
  for (let i = 0; i < histA.length; i += 1) {
    l1 += Math.abs(histA[i] - histB[i]);
    total += Math.max(histA[i], histB[i]);
  }
  if (total <= 1e-6) return 1;
  return clamp01(1 - l1 / total);
}

export async function evaluateVisualFidelity(input: CompareInput): Promise<VisualFidelityResult> {
  const threshold = input.threshold ?? 0.94;
  const width = Math.max(16, Math.floor(input.width));
  const height = Math.max(16, Math.floor(input.height));

  const [sourceData, renderData] = await Promise.all([
    drawToImageData(input.sourceDataUrl, width, height),
    drawToImageData(toSvgDataUrl(input.renderedSvg), width, height),
  ]);

  const pixelSimilarity = computePixelSimilarity(sourceData.data, renderData.data);
  const edgeSimilarity = computeEdgeSimilarity(sourceData.data, renderData.data, width, height);
  const colorSimilarity = computeColorSimilarity(sourceData.data, renderData.data);

  const score = clamp01(pixelSimilarity * 0.6 + edgeSimilarity * 0.25 + colorSimilarity * 0.15);

  return {
    pass: score >= threshold,
    threshold,
    width,
    height,
    metrics: {
      pixelSimilarity,
      edgeSimilarity,
      colorSimilarity,
      score,
    },
  };
}
