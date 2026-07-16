import { describe, expect, it } from 'vitest';

import {
  projectRasterNormalizationTarget,
  rasterDimensionsMatch,
} from '@/lib/projectRasterGeometry';

describe('project raster geometry', () => {
  it('keeps a dedicated background that already matches the project canvas', () => {
    expect(rasterDimensionsMatch(
      { width: 480, height: 480 },
      { width: 480, height: 480 },
    )).toBe(true);
    expect(projectRasterNormalizationTarget(
      { width: 480, height: 480 },
      { width: 480, height: 480 },
    )).toBeNull();
  });

  it('requires exact target dimensions for MAIN and AOD packaging', () => {
    expect(projectRasterNormalizationTarget(
      { width: 466, height: 466 },
      { width: 480, height: 480 },
    )).toEqual({ width: 480, height: 480 });
    expect(projectRasterNormalizationTarget(
      { width: 480, height: 480 },
      { width: 466, height: 390 },
    )).toEqual({ width: 466, height: 390 });
  });
});
