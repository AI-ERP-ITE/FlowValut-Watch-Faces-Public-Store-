export interface RasterDimensions {
  width: number;
  height: number;
}

export function rasterDimensionsMatch(
  raster: RasterDimensions,
  canvas: RasterDimensions,
): boolean {
  return raster.width === canvas.width && raster.height === canvas.height;
}

export function projectRasterNormalizationTarget(
  raster: RasterDimensions,
  canvas: RasterDimensions,
): RasterDimensions | null {
  return rasterDimensionsMatch(raster, canvas) ? null : { ...canvas };
}
