export interface AlphaMaskStats {
  coverage: number;
  centroidX: number;
  centroidY: number;
  partialAlphaPixels: number;
}

export interface WatchSafeTextAlphaResult {
  data: Uint8ClampedArray;
  source: AlphaMaskStats;
  result: AlphaMaskStats;
  dominantRgb: [number, number, number];
}

export function measureAlphaMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): AlphaMaskStats {
  let coverage = 0;
  let weightedX = 0;
  let weightedY = 0;
  let partialAlphaPixels = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alphaByte = data[(y * width + x) * 4 + 3];
      const alpha = alphaByte / 255;
      coverage += alpha;
      weightedX += x * alpha;
      weightedY += y * alpha;
      if (alphaByte > 0 && alphaByte < 255) partialAlphaPixels += 1;
    }
  }
  return {
    coverage,
    centroidX: coverage > 0 ? weightedX / coverage : width / 2,
    centroidY: coverage > 0 ? weightedY / coverage : height / 2,
    partialAlphaPixels,
  };
}

function findDominantTextRgb(data: Uint8ClampedArray): [number, number, number] {
  const counts = new Map<string, number>();
  const collect = (requireOpaque: boolean) => {
    for (let offset = 0; offset < data.length; offset += 4) {
      const alpha = data[offset + 3];
      if (requireOpaque ? alpha !== 255 : alpha === 0) continue;
      const key = `${data[offset]},${data[offset + 1]},${data[offset + 2]}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  };
  collect(true);
  if (counts.size === 0) collect(false);
  const winner = [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
  return (winner?.split(',').map(Number) ?? [255, 255, 255]) as [number, number, number];
}

export function finalizeWatchSafeTextAlpha(
  sourceData: Uint8ClampedArray,
  width: number,
  height: number,
): WatchSafeTextAlphaResult {
  if (sourceData.length !== width * height * 4) {
    throw new Error('RGBA buffer dimensions do not match');
  }
  const source = measureAlphaMask(sourceData, width, height);
  if (source.coverage === 0) {
    return {
      data: new Uint8ClampedArray(sourceData),
      source,
      result: source,
      dominantRgb: [255, 255, 255],
    };
  }

  const desiredOpaquePixels = Math.max(1, Math.round(source.coverage));
  const pixels: Array<{ x: number; y: number; alpha: number; selected: boolean }> = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = sourceData[(y * width + x) * 4 + 3];
      if (alpha > 0) pixels.push({ x, y, alpha, selected: false });
    }
  }
  pixels.sort((left, right) =>
    right.alpha - left.alpha
    || Math.hypot(left.x - source.centroidX, left.y - source.centroidY)
      - Math.hypot(right.x - source.centroidX, right.y - source.centroidY)
    || left.y - right.y
    || left.x - right.x
  );
  for (let index = 0; index < Math.min(desiredOpaquePixels, pixels.length); index += 1) {
    pixels[index].selected = true;
  }

  let selectedX = pixels.filter((pixel) => pixel.selected).reduce((sum, pixel) => sum + pixel.x, 0);
  let selectedY = pixels.filter((pixel) => pixel.selected).reduce((sum, pixel) => sum + pixel.y, 0);
  const targetX = source.centroidX * desiredOpaquePixels;
  const targetY = source.centroidY * desiredOpaquePixels;
  const centroidError = (sumX: number, sumY: number) =>
    ((sumX - targetX) / desiredOpaquePixels) ** 2
    + ((sumY - targetY) / desiredOpaquePixels) ** 2;

  for (let iteration = 0; iteration < 256; iteration += 1) {
    const selectedBoundary = pixels.filter((pixel) => pixel.selected && pixel.alpha < 255);
    const unselectedBoundary = pixels.filter((pixel) => !pixel.selected);
    const currentError = centroidError(selectedX, selectedY);
    let bestSwap: {
      remove: (typeof pixels)[number];
      add: (typeof pixels)[number];
      nextX: number;
      nextY: number;
      score: number;
    } | null = null;
    for (const remove of selectedBoundary) {
      for (const add of unselectedBoundary) {
        const nextX = selectedX - remove.x + add.x;
        const nextY = selectedY - remove.y + add.y;
        const nextError = centroidError(nextX, nextY);
        const alphaPenalty = Math.max(0, remove.alpha - add.alpha) / 255 * 0.0005;
        const score = nextError + alphaPenalty;
        if (score + 1e-12 >= currentError) continue;
        if (!bestSwap || score < bestSwap.score) {
          bestSwap = { remove, add, nextX, nextY, score };
        }
      }
    }
    if (!bestSwap) break;
    bestSwap.remove.selected = false;
    bestSwap.add.selected = true;
    selectedX = bestSwap.nextX;
    selectedY = bestSwap.nextY;
  }

  const selectedIndexes = new Set(
    pixels.filter((pixel) => pixel.selected).map((pixel) => pixel.y * width + pixel.x),
  );
  const dominantRgb = findDominantTextRgb(sourceData);
  const output = new Uint8ClampedArray(sourceData.length);
  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
    if (!selectedIndexes.has(pixelIndex)) continue;
    const offset = pixelIndex * 4;
    output[offset] = dominantRgb[0];
    output[offset + 1] = dominantRgb[1];
    output[offset + 2] = dominantRgb[2];
    output[offset + 3] = 255;
  }
  return {
    data: output,
    source,
    result: measureAlphaMask(output, width, height),
    dominantRgb,
  };
}

