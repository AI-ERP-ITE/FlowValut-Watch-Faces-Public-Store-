export type PngArcDirection = 'clockwise' | 'counter-clockwise';

export interface PngArcRevealOptions {
  width: number;
  height: number;
  startAngle: number;
  endAngle: number;
  direction: PngArcDirection;
  progress: number;
  centerX?: number;
  centerY?: number;
}

export interface PngArcFrameOptions extends Omit<PngArcRevealOptions, 'width' | 'height' | 'progress'> {
  frameCount: 11 | 21;
}

const normalizeDegrees = (angle: number): number => ((angle % 360) + 360) % 360;

function directedDistance(from: number, to: number, direction: PngArcDirection): number {
  return direction === 'clockwise'
    ? normalizeDegrees(to - from)
    : normalizeDegrees(from - to);
}

/**
 * Applies a Zepp-angle reveal to already-decoded RGBA pixels.
 * Zepp angles use 0° at 12 o'clock and increase clockwise.
 */
export function revealPngArcRgba(
  source: Uint8ClampedArray,
  options: PngArcRevealOptions,
): Uint8ClampedArray {
  const { width, height, startAngle, endAngle, direction } = options;
  if (source.length !== width * height * 4) {
    throw new Error('RGBA buffer dimensions do not match PNG Arc dimensions');
  }

  const progress = Math.max(0, Math.min(1, options.progress));
  const output = new Uint8ClampedArray(source);
  if (progress >= 1) return output;

  const centerX = options.centerX ?? (width - 1) / 2;
  const centerY = options.centerY ?? (height - 1) / 2;
  const span = directedDistance(startAngle, endAngle, direction);
  const visibleSpan = span * progress;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = (y * width + x) * 4;
      if (source[pixel + 3] === 0) continue;

      const dx = x - centerX;
      const dy = y - centerY;
      const angle = normalizeDegrees((Math.atan2(dx, -dy) * 180) / Math.PI);
      const distance = directedDistance(startAngle, angle, direction);
      if (progress <= 0 || distance > visibleSpan + 1e-7 || distance > span + 1e-7) {
        output[pixel + 3] = 0;
      }
    }
  }

  return output;
}

function loadPng(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to decode active PNG Arc image'));
    image.src = dataUrl;
  });
}

/** Generates finished PNG frames in the browser. The watch never processes a mask. */
export async function generatePngArcFrames(
  activeDataUrl: string,
  options: PngArcFrameOptions,
): Promise<string[]> {
  const image = await loadPng(activeDataUrl);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (width < 1 || height < 1) throw new Error('Active PNG Arc image has invalid dimensions');

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) throw new Error('PNG Arc canvas is unavailable');
  sourceContext.drawImage(image, 0, 0);
  const source = sourceContext.getImageData(0, 0, width, height);

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = width;
  frameCanvas.height = height;
  const frameContext = frameCanvas.getContext('2d');
  if (!frameContext) throw new Error('PNG Arc frame canvas is unavailable');

  const frames: string[] = [];
  for (let index = 0; index < options.frameCount; index += 1) {
    const progress = index / (options.frameCount - 1);
    const pixels = revealPngArcRgba(source.data, {
      width,
      height,
      startAngle: options.startAngle,
      endAngle: options.endAngle,
      direction: options.direction,
      progress,
    });
    frameContext.clearRect(0, 0, width, height);
    // Copy into an ArrayBuffer-backed view accepted by the browser ImageData
    // constructor (the pure helper intentionally accepts ArrayBufferLike).
    const imageDataPixels = new Uint8ClampedArray(pixels.length);
    imageDataPixels.set(pixels);
    frameContext.putImageData(new ImageData(imageDataPixels, width, height), 0, 0);
    frames.push(frameCanvas.toDataURL('image/png'));
  }
  return frames;
}

export function estimateDataUrlBytes(dataUrls: readonly string[]): number {
  return dataUrls.reduce((total, value) => {
    const payload = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value;
    return total + Math.floor((payload.length * 3) / 4);
  }, 0);
}

export function selectPngArcFrame(frames: readonly string[] | undefined, progress: number): string | undefined {
  if (!frames?.length) return undefined;
  const normalized = Math.max(0, Math.min(1, progress));
  return frames[Math.round(normalized * (frames.length - 1))];
}
