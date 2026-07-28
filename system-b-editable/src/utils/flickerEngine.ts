export type FlickerSeverity = 'none' | 'medium' | 'high';

export interface FlickerAnalysisResult {
  forbiddenCount: number;
  totalCount: number;
  ratio: number;
  severity: FlickerSeverity;
  mask: Uint8Array;
}

export interface FlickerAnalysisOptions {
  mediumThreshold?: number;
  highThreshold?: number;
}

const DEFAULT_MEDIUM_THRESHOLD = 0.02;
const DEFAULT_HIGH_THRESHOLD = 0.1;

export function isFlickerForbiddenRgb(r: number, g: number, b: number): boolean {
  return (r > 0 && r < 47) || (g > 0 && g < 47) || (b > 0 && b < 47);
}

export function analyzeFlicker(
  imageData: ImageData,
  options: FlickerAnalysisOptions = {},
): FlickerAnalysisResult {
  const mediumThreshold = options.mediumThreshold ?? DEFAULT_MEDIUM_THRESHOLD;
  const highThreshold = options.highThreshold ?? DEFAULT_HIGH_THRESHOLD;
  const data = imageData.data;
  const mask = new Uint8Array(imageData.width * imageData.height);

  let forbiddenCount = 0;
  let totalCount = 0;

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    if (data[i + 3] === 0) continue;
    totalCount += 1;

    if (isFlickerForbiddenRgb(data[i], data[i + 1], data[i + 2])) {
      forbiddenCount += 1;
      mask[p] = 1;
    }
  }

  const ratio = totalCount > 0 ? forbiddenCount / totalCount : 0;
  const severity: FlickerSeverity = ratio >= highThreshold
    ? 'high'
    : ratio >= mediumThreshold
      ? 'medium'
      : 'none';

  return {
    forbiddenCount,
    totalCount,
    ratio,
    severity,
    mask,
  };
}
