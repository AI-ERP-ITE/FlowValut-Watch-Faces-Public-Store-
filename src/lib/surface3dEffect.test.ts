import { describe, expect, it } from 'vitest';
import type { WatchFaceElement } from '@/types';
import {
  DEFAULT_SURFACE_3D,
  getSurface3dAssetNames,
  isSurface3dEligible,
  normalizeSurface3d,
  replaceSurface3dAssetName,
  renderSurface3dPixels,
} from './surface3dEffect';

function materialFixture(): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(7 * 7 * 4);
  for (let y = 1; y < 6; y += 1) {
    for (let x = 1; x < 6; x += 1) {
      const offset = (y * 7 + x) * 4;
      pixels[offset] = 90;
      pixels[offset + 1] = 130;
      pixels[offset + 2] = 170;
      pixels[offset + 3] = x === 1 || x === 5 || y === 1 || y === 5 ? 120 : 255;
    }
  }
  pixels[(0 * 7 + 3) * 4 + 3] = 4;
  return pixels;
}

describe('watch-safe 3D surface effect', () => {
  it('normalizes unsafe values and keeps the renderer contract fixed', () => {
    const normalized = normalizeSurface3d({
      enabled: true,
      radius: 99,
      depth: -3,
      soften: 30,
      lightElevation: 2,
      specular: 4,
      effectOpacity: 2,
      scaleWithObject: false as true,
      rendererVersion: 99 as 1,
    });
    expect(normalized).toMatchObject({
      enabled: true,
      radius: 12,
      depth: 0,
      soften: 8,
      lightElevation: 15,
      specular: 0.75,
      effectOpacity: 1,
      scaleWithObject: true,
      rendererVersion: 1,
    });
  });

  it('is byte-identical when disabled or absent', () => {
    const source = materialFixture();
    expect(renderSurface3dPixels(source, 7, 7)).toEqual(source);
    expect(renderSurface3dPixels(source, 7, 7, { ...DEFAULT_SURFACE_3D, enabled: false })).toEqual(source);
  });

  it('renders deterministically while preserving opaque cores and removing unsafe fringe alpha', () => {
    const source = materialFixture();
    const config = { ...DEFAULT_SURFACE_3D, enabled: true };
    const first = renderSurface3dPixels(source, 7, 7, config);
    const second = renderSurface3dPixels(source, 7, 7, config);
    expect(first).toEqual(second);
    expect(first).not.toEqual(source);
    expect(first[(3 * 7 + 3) * 4 + 3]).toBe(255);
    expect(first[(0 * 7 + 3) * 4 + 3]).toBe(0);
  });

  it('produces distinct raised and recessed lighting without changing geometry', () => {
    const source = materialFixture();
    const raised = renderSurface3dPixels(source, 7, 7, { ...DEFAULT_SURFACE_3D, enabled: true, direction: 'raised' });
    const recessed = renderSurface3dPixels(source, 7, 7, { ...DEFAULT_SURFACE_3D, enabled: true, direction: 'recessed' });
    expect(raised).not.toEqual(recessed);
    expect(raised.length).toBe(source.length);
    expect(recessed.length).toBe(source.length);
  });

  it('limits controls to raster-backed widget families', () => {
    expect(isSurface3dEligible({ type: 'IMG', arcRenderMode: undefined })).toBe(true);
    expect(isSurface3dEligible({ type: 'TIME_POINTER', arcRenderMode: undefined })).toBe(true);
    expect(isSurface3dEligible({ type: 'ARC_PROGRESS', arcRenderMode: 'native' })).toBe(false);
    expect(isSurface3dEligible({ type: 'ARC_PROGRESS', arcRenderMode: 'png-frames' })).toBe(true);
    expect(isSurface3dEligible({ type: 'TEXT', arcRenderMode: undefined })).toBe(false);
  });

  it('round-trips settings through the existing FVWF JSON contract', () => {
    const element: WatchFaceElement = {
      id: 'surface-test', type: 'IMG', name: 'Surface test', bounds: { x: 1, y: 2, width: 40, height: 60 },
      visible: true, zIndex: 1, surface3d: { ...DEFAULT_SURFACE_3D, enabled: true, profile: 'polished-metal' },
    };
    expect(JSON.parse(JSON.stringify(element))).toEqual(element);
  });

  it('rewrites clock-hand assets without moving geometry or pivots', () => {
    const element: WatchFaceElement = {
      id: 'hands', type: 'TIME_POINTER', name: 'Hands', bounds: { x: 0, y: 0, width: 480, height: 480 },
      center: { x: 240, y: 240 }, hourPos: { x: 20, y: 80 }, minutePos: { x: 20, y: 100 },
      hourHandSrc: 'hour.png', minuteHandSrc: 'minute.png', secondHandSrc: 'second.png', coverSrc: 'cover.png',
      visible: true, zIndex: 1,
    };
    const geometryBefore = structuredClone({ bounds: element.bounds, center: element.center, hourPos: element.hourPos, minutePos: element.minutePos });
    expect(getSurface3dAssetNames(element)).toEqual(['hour.png', 'minute.png', 'second.png', 'cover.png']);
    replaceSurface3dAssetName(element, 'hour.png', 'surface-hour.png');
    expect(element.hourHandSrc).toBe('surface-hour.png');
    expect({ bounds: element.bounds, center: element.center, hourPos: element.hourPos, minutePos: element.minutePos }).toEqual(geometryBefore);
  });

  it('isolates shared icon assets by converting the export snapshot to a normal image reference', () => {
    const element: WatchFaceElement = {
      id: 'icon', type: 'IMG', name: 'Icon', iconKey: 'tabler:heart',
      bounds: { x: 10, y: 20, width: 30, height: 40 }, visible: true, zIndex: 1,
    };
    const source = getSurface3dAssetNames(element)[0];
    replaceSurface3dAssetName(element, source, 'surface3d_icon_00.png');
    expect(element).toMatchObject({ src: 'surface3d_icon_00.png', assetFilename: 'surface3d_icon_00.png', iconKey: undefined });
    expect(element.bounds).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });
});
