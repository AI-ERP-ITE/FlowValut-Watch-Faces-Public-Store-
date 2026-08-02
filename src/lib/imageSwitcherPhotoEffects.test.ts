import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('Image Switcher photo effects contract', () => {
  it('exposes the complete deterministic photo editor for IMG_LEVEL', () => {
    const source = read('../components/PropertyPanel.tsx');
    expect(source).toContain("element.type === 'IMG_LEVEL'");
    expect(source).toContain("'Image Switcher Photo Effects'");
    for (const control of [
      'exposure', 'brightness', 'contrast', 'highlights', 'shadows',
      'temperature', 'tint', 'sharpness', 'vignette',
    ]) {
      expect(source).toContain(`key: '${control}'`);
    }
  });

  it('uses the same deterministic renderer for switcher preview frames', () => {
    const source = read('../components/InteractiveCanvas.tsx');
    const switcherCase = source.slice(source.indexOf("case 'IMG_LEVEL':"), source.indexOf("case 'IMG_STATUS':"));
    expect(switcherCase.match(/drawImageWithDeterministicIconEffects/g)?.length).toBe(2);
    expect(switcherCase).not.toContain('ctx.drawImage(cached');
  });

  it('bakes inline and file-backed switcher frames into element-specific PNGs', () => {
    const source = read('../StudioApp.tsx');
    expect(source).toContain('const hasSwitcherEffects = hasDeterministicImageEffects(el)');
    expect(source).toContain('await applyIconEffectsForZPK(resizedFrame, el, frameW, frameH)');
    expect(source).toContain('await applyIconEffectsForZPK(sourceDataUrl, el, frameW, frameH)');
    expect(source).toContain("cannot load Image Switcher frame");
  });

  it('preserves rectangular sharpness borders using independent width and height loops', () => {
    const source = read('./effectsBakeEngine.ts');
    expect(source).toContain('for (let x = 0; x < W; x++)');
    expect(source).toContain('for (let y = 0; y < H; y++)');
    expect(source).not.toContain('const SIZE = base.width');
  });
});
