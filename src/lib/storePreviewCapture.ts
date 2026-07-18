export interface StorePreviewCanvas {
  toDataURL(type?: string): string;
}

export interface StableCanvasCaptureOptions {
  sampleIntervalMs?: number;
  settleMs?: number;
  timeoutMs?: number;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function captureStableCanvas(
  canvas: StorePreviewCanvas,
  options: StableCanvasCaptureOptions = {},
): Promise<string> {
  const sampleIntervalMs = options.sampleIntervalMs ?? 50;
  const settleMs = options.settleMs ?? 300;
  const timeoutMs = options.timeoutMs ?? 5000;
  const startedAt = Date.now();
  let stableSince = startedAt;
  let previous = canvas.toDataURL('image/png');

  while (Date.now() - startedAt < timeoutMs) {
    await delay(sampleIntervalMs);
    const current = canvas.toDataURL('image/png');
    if (current !== previous) {
      previous = current;
      stableSince = Date.now();
      continue;
    }
    if (Date.now() - stableSince >= settleMs) return current;
  }

  return previous;
}

export async function captureStorePreviews(input: {
  mainCanvas: StorePreviewCanvas;
  aodCanvas?: StorePreviewCanvas | null;
  hasExplicitAod: boolean;
  capture?: (canvas: StorePreviewCanvas) => Promise<string>;
}): Promise<{ main: string; aod: string }> {
  const capture = input.capture ?? captureStableCanvas;
  const main = await capture(input.mainCanvas);
  const aod = input.hasExplicitAod && input.aodCanvas
    ? await capture(input.aodCanvas)
    : main;
  return { main, aod };
}
