import type {
  PointerParityMismatch,
  PointerParityResult,
  PointerParityStage,
} from '@/types';

export const POINTER_PARITY_TOLERANCE = 0.015;
export const POINTER_PARITY_PIXEL_DELTA = 4;

export interface PointerParityComparison {
  leftStage: PointerParityStage;
  rightStage: PointerParityStage;
  width: number;
  height: number;
  mismatchRatio: number;
  maxChannelDelta: number;
  mismatchedPixels: number;
  totalPixels: number;
  pass: boolean;
}

export function compareImageDataDeterministic(
  leftStage: PointerParityStage,
  rightStage: PointerParityStage,
  left: ImageData,
  right: ImageData,
  tolerance = POINTER_PARITY_TOLERANCE,
): PointerParityComparison {
  if (left.width !== right.width || left.height !== right.height) {
    return {
      leftStage,
      rightStage,
      width: Math.min(left.width, right.width),
      height: Math.min(left.height, right.height),
      mismatchRatio: 1,
      maxChannelDelta: 255,
      mismatchedPixels: Math.max(left.width * left.height, right.width * right.height),
      totalPixels: Math.max(left.width * left.height, right.width * right.height),
      pass: false,
    };
  }

  const pixelCount = left.width * left.height;
  const leftData = left.data;
  const rightData = right.data;
  let mismatchedPixels = 0;
  let maxChannelDelta = 0;

  for (let i = 0; i < leftData.length; i += 4) {
    const dr = Math.abs(leftData[i] - rightData[i]);
    const dg = Math.abs(leftData[i + 1] - rightData[i + 1]);
    const db = Math.abs(leftData[i + 2] - rightData[i + 2]);
    const da = Math.abs(leftData[i + 3] - rightData[i + 3]);

    const pixelMax = Math.max(dr, dg, db, da);
    if (pixelMax > maxChannelDelta) {
      maxChannelDelta = pixelMax;
    }
    if (pixelMax > POINTER_PARITY_PIXEL_DELTA) {
      mismatchedPixels += 1;
    }
  }

  const mismatchRatio = pixelCount > 0 ? mismatchedPixels / pixelCount : 0;
  return {
    leftStage,
    rightStage,
    width: left.width,
    height: left.height,
    mismatchRatio,
    maxChannelDelta,
    mismatchedPixels,
    totalPixels: pixelCount,
    pass: mismatchRatio <= tolerance,
  };
}

export function createPointerParityResult(
  comparisons: PointerParityComparison[],
  tolerance = POINTER_PARITY_TOLERANCE,
): PointerParityResult {
  const mismatches: PointerParityMismatch[] = comparisons
    .filter((c) => !c.pass)
    .map((c) => ({
      leftStage: c.leftStage,
      rightStage: c.rightStage,
      mismatchRatio: c.mismatchRatio,
      maxChannelDelta: c.maxChannelDelta,
      reason: c.mismatchRatio > tolerance
        ? `Mismatch ratio ${c.mismatchRatio.toFixed(4)} exceeded tolerance ${tolerance.toFixed(4)}`
        : undefined,
    }));

  return {
    pass: mismatches.length === 0,
    tolerance,
    mismatches,
  };
}

export function createMissingStageParityResult(
  missingStages: PointerParityStage[],
  tolerance = POINTER_PARITY_TOLERANCE,
): PointerParityResult {
  const stageList = missingStages.join(', ');
  return {
    pass: false,
    tolerance,
    mismatches: [
      {
        leftStage: 'composer-preview',
        rightStage: 'baked-export',
        mismatchRatio: 1,
        maxChannelDelta: 255,
        reason: `Missing parity snapshots: ${stageList}`,
      },
    ],
  };
}

export function runPointerParityChecks(
  snapshots: Record<PointerParityStage, ImageData>,
  tolerance = POINTER_PARITY_TOLERANCE,
): { comparisons: PointerParityComparison[]; result: PointerParityResult } {
  const pairs: Array<[PointerParityStage, PointerParityStage]> = [
    ['composer-preview', 'adjustment-preview'],
    ['composer-preview', 'baked-export'],
    ['adjustment-preview', 'baked-export'],
  ];

  const comparisons = pairs.map(([left, right]) =>
    compareImageDataDeterministic(left, right, snapshots[left], snapshots[right], tolerance),
  );

  // Repeat the exact same computation and verify results do not drift between runs.
  // This protects the parity gate from hidden non-determinism.
  const repeatComparisons = pairs.map(([left, right]) =>
    compareImageDataDeterministic(left, right, snapshots[left], snapshots[right], tolerance),
  );

  const stableComparisons = comparisons.map((base, index) => {
    const repeat = repeatComparisons[index];
    const ratioDrift = Math.abs(base.mismatchRatio - repeat.mismatchRatio);
    const deltaDrift = Math.abs(base.maxChannelDelta - repeat.maxChannelDelta);
    if (ratioDrift > 0 || deltaDrift > 0) {
      return {
        ...base,
        pass: false,
        mismatchRatio: Math.max(base.mismatchRatio, repeat.mismatchRatio),
        maxChannelDelta: Math.max(base.maxChannelDelta, repeat.maxChannelDelta),
      };
    }
    return base;
  });

  const result = createPointerParityResult(stableComparisons, tolerance);
  for (let i = 0; i < stableComparisons.length; i += 1) {
    const base = comparisons[i];
    const repeat = repeatComparisons[i];
    const ratioDrift = Math.abs(base.mismatchRatio - repeat.mismatchRatio);
    const deltaDrift = Math.abs(base.maxChannelDelta - repeat.maxChannelDelta);
    if (ratioDrift > 0 || deltaDrift > 0) {
      result.pass = false;
      result.mismatches.push({
        leftStage: base.leftStage,
        rightStage: base.rightStage,
        mismatchRatio: Math.max(base.mismatchRatio, repeat.mismatchRatio),
        maxChannelDelta: Math.max(base.maxChannelDelta, repeat.maxChannelDelta),
        reason: `Parity comparison drift detected across repeat runs (ratio drift ${ratioDrift.toFixed(6)}, delta drift ${deltaDrift}).`,
      });
    }
  }

  return {
    comparisons: stableComparisons,
    result,
  };
}
