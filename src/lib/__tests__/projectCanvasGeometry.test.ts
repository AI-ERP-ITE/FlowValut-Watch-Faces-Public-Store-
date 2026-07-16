import { describe, expect, it } from 'vitest';

import type { WatchFaceConfig, WatchFaceElement } from '@/types';
import {
  canvasResolutionsMatch,
  isProjectBackgroundElement,
  rearrangeElementPosition,
  rearrangeProjectPositions,
} from '@/lib/projectCanvasGeometry';

const source = { width: 480, height: 480 };
const target = { width: 466, height: 466 };

function element(overrides: Partial<WatchFaceElement> = {}): WatchFaceElement {
  return {
    id: 'fixture',
    type: 'IMG',
    name: 'Fixture',
    bounds: { x: 190, y: 200, width: 100, height: 80 },
    visible: true,
    zIndex: 1,
    ...overrides,
  };
}

describe('project canvas geometry', () => {
  it('compares width and height independently', () => {
    expect(canvasResolutionsMatch({ width: 466, height: 466 }, { width: 466, height: 466 })).toBe(true);
    expect(canvasResolutionsMatch({ width: 466, height: 466 }, { width: 466, height: 450 })).toBe(false);
  });

  it('repositions a centered bounds anchor without resizing artwork', () => {
    const input = element();
    const result = rearrangeElementPosition(input, source, target);

    expect(result.bounds.width).toBe(100);
    expect(result.bounds.height).toBe(80);
    expect(result.bounds.x + result.bounds.width / 2).toBeCloseTo(233);
    expect(result.bounds.y + result.bounds.height / 2).toBeCloseTo(233);
    expect(input.bounds).toEqual({ x: 190, y: 200, width: 100, height: 80 });
  });

  it('uses the configured horizontal alignment anchor', () => {
    const left = rearrangeElementPosition(element({ alignH: 'LEFT' }), source, target);
    const right = rearrangeElementPosition(element({ alignH: 'RIGHT' }), source, target);

    expect(left.bounds.x).toBeCloseTo(190 * 466 / 480);
    expect(right.bounds.x + right.bounds.width).toBeCloseTo(290 * 466 / 480);
    expect(left.bounds.width).toBe(100);
    expect(right.bounds.width).toBe(100);
  });

  it('repositions an explicit project-space center and clears derived digit origin', () => {
    const result = rearrangeElementPosition(element({
      type: 'ARC_PROGRESS',
      center: { x: 240, y: 120 },
      layoutStartX: 199,
    }), source, { width: 466, height: 390 });

    expect(result.center).toEqual({ x: 233, y: 97.5 });
    expect(result.layoutStartX).toBeUndefined();
  });

  it('returns TIME_POINTER geometry untouched', () => {
    const pointer = element({
      type: 'TIME_POINTER',
      center: { x: 240, y: 240 },
      pointerCenter: { x: 241, y: 239 },
      hourPos: { x: 11, y: 118 },
      minutePos: { x: 8, y: 172 },
      secondPos: { x: 4, y: 180 },
    });

    const result = rearrangeElementPosition(pointer, source, target);
    expect(result).toBe(pointer);
    expect(result).toEqual(pointer);
  });

  it('rearranges MAIN and AOD on a cloned config', () => {
    const main = element({ id: 'main' });
    const aod = element({ id: 'aod', bounds: { x: 20, y: 30, width: 40, height: 50 } });
    const config = {
      name: 'Fixture',
      watchModel: 'Model',
      resolution: source,
      background: { src: 'background.png', format: 'TGA-P' },
      elements: [main],
      aodElements: [aod],
    } as WatchFaceConfig;

    const result = rearrangeProjectPositions(config, target);
    expect(result.resolution).toEqual(target);
    expect(result.elements[0].bounds.width).toBe(main.bounds.width);
    expect(result.aodElements?.[0].bounds.height).toBe(aod.bounds.height);
    expect(result.elements[0]).not.toBe(main);
    expect(config.resolution).toEqual(source);
    expect(config.elements[0].bounds).toEqual(main.bounds);
  });

  it('recognizes semantic or resolution-sized backgrounds without stealing gauge siblings', () => {
    expect(isProjectBackgroundElement(element({ name: 'Background' }), target)).toBe(true);
    expect(isProjectBackgroundElement(element({ bounds: { x: 0, y: 0, width: 466, height: 466 } }), target)).toBe(true);
    expect(isProjectBackgroundElement(element({ bounds: { x: 0, y: 0, width: 480, height: 480 } }), target)).toBe(false);
    expect(isProjectBackgroundElement(element({
      name: 'Background',
      gaugePairId: 'gauge-1',
      bounds: { x: 0, y: 0, width: 466, height: 466 },
    }), target)).toBe(false);
  });
});
