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

  it('rearranges a centered finished widget shell proportionally', () => {
    const input = element();
    const result = rearrangeElementPosition(input, source, target);

    expect(result.bounds.width).toBeCloseTo(100 * 466 / 480);
    expect(result.bounds.height).toBeCloseTo(80 * 466 / 480);
    expect(result.bounds.x + result.bounds.width / 2).toBeCloseTo(233);
    expect(result.bounds.y + result.bounds.height / 2).toBeCloseTo(233);
    expect(input.bounds).toEqual({ x: 190, y: 200, width: 100, height: 80 });
  });

  it('uses the configured horizontal alignment anchor', () => {
    const left = rearrangeElementPosition(element({ alignH: 'LEFT' }), source, target);
    const right = rearrangeElementPosition(element({ alignH: 'RIGHT' }), source, target);

    expect(left.bounds.x).toBeCloseTo(190 * 466 / 480);
    expect(right.bounds.x + right.bounds.width).toBeCloseTo(290 * 466 / 480);
    expect(left.bounds.width).toBeCloseTo(100 * 466 / 480);
    expect(right.bounds.width).toBeCloseTo(100 * 466 / 480);
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

  it('moves TIME_POINTER project centers while preserving engine-local geometry', () => {
    const pointer = element({
      type: 'TIME_POINTER',
      bounds: { x: 0, y: 0, width: 480, height: 480 },
      center: { x: 240, y: 240 },
      pointerCenter: { x: 241, y: 239 },
      hourPos: { x: 11, y: 118 },
      minutePos: { x: 8, y: 172 },
      secondPos: { x: 4, y: 180 },
    });

    const result = rearrangeElementPosition(pointer, source, target);
    expect(result).not.toBe(pointer);
    expect(result.bounds).toEqual({ x: 0, y: 0, width: 466, height: 466 });
    expect(result.center).toEqual({ x: 233, y: 233 });
    expect(result.pointerCenter?.x).toBeCloseTo(241 * 466 / 480);
    expect(result.pointerCenter?.y).toBeCloseTo(239 * 466 / 480);
    expect(result.hourPos).toEqual(pointer.hourPos);
    expect(result.minutePos).toEqual(pointer.minutePos);
    expect(result.secondPos).toEqual(pointer.secondPos);
  });

  it('adds a target center for a legacy TIME_POINTER without mutating local hand fields', () => {
    const pointer = element({
      type: 'TIME_POINTER',
      bounds: { x: 0, y: 0, width: 480, height: 480 },
      hourPos: { x: 11, y: 118 },
    });
    const result = rearrangeElementPosition(pointer, source, target);

    expect(result.center).toEqual({ x: 233, y: 233 });
    expect(result.hourPos).toEqual({ x: 11, y: 118 });
  });

  it('preserves a legacy pointer shell that already uses the target canvas', () => {
    const pointer = element({
      type: 'TIME_POINTER',
      bounds: { x: 0, y: 0, width: 480, height: 480 },
      center: { x: 240, y: 240 },
      pointerCenter: { x: 238, y: 241 },
      hourPos: { x: 11, y: 123 },
      minutePos: { x: 8, y: 182 },
    });
    const result = rearrangeElementPosition(
      pointer,
      { width: 466, height: 466 },
      { width: 480, height: 480 },
    );

    expect(result.bounds).toEqual({ x: 0, y: 0, width: 480, height: 480 });
    expect(result.center).toEqual({ x: 240, y: 240 });
    expect(result.pointerCenter).toEqual({ x: 238, y: 241 });
    expect(result.hourPos).toEqual(pointer.hourPos);
    expect(result.minutePos).toEqual(pointer.minutePos);
  });

  it('scales every finished widget shell while limiting internal metric changes to safe types', () => {
    const text = rearrangeElementPosition(element({
      type: 'TEXT',
      fontSize: 40,
      bounds: { x: 190, y: 210, width: 100, height: 60 },
    }), source, target);
    const image = rearrangeElementPosition(element({
      type: 'IMG',
      bounds: { x: 190, y: 210, width: 100, height: 60 },
    }), source, target);

    expect(text.bounds.width).toBeCloseTo(100 * 466 / 480);
    expect(text.bounds.height).toBeCloseTo(60 * 466 / 480);
    expect(text.fontSize).toBeCloseTo(40 * 466 / 480);
    expect(image.bounds.width).toBeCloseTo(100 * 466 / 480);
    expect(image.bounds.height).toBeCloseTo(60 * 466 / 480);
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

    const result = rearrangeProjectPositions(config, target, 'Target Model');
    expect(result.resolution).toEqual(target);
    expect(result.watchModel).toBe('Target Model');
    expect(result.elements[0].bounds.width).toBeCloseTo(main.bounds.width * 466 / 480);
    expect(result.aodElements?.[0].bounds.height).toBeCloseTo(aod.bounds.height * 466 / 480);
    expect(result.elements[0]).not.toBe(main);
    expect(config.resolution).toEqual(source);
    expect(config.elements[0].bounds).toEqual(main.bounds);
  });

  it('normalizes logical background bounds to the target canvas', () => {
    const result = rearrangeElementPosition(element({
      name: 'Background',
      bounds: { x: 0, y: 0, width: 480, height: 480 },
    }), source, target);
    expect(result.bounds).toEqual({ x: 0, y: 0, width: 466, height: 466 });
  });

  it('round-trips 480 to 466 and back within numeric tolerance', () => {
    const original = element({ bounds: { x: 91.25, y: 117.5, width: 123, height: 77 } });
    const smaller = rearrangeElementPosition(original, source, target);
    const restored = rearrangeElementPosition(smaller, target, source);

    expect(restored.bounds.x).toBeCloseTo(original.bounds.x, 10);
    expect(restored.bounds.y).toBeCloseTo(original.bounds.y, 10);
    expect(restored.bounds.width).toBeCloseTo(original.bounds.width, 10);
    expect(restored.bounds.height).toBeCloseTo(original.bounds.height, 10);
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
