import { describe, expect, it } from 'vitest';
import { runEngine } from '../index.js';

function createQualityTemplate() {
  return {
    layout: { shape: 'circle', width: 454, height: 454, padding: 0, baseRadius: 0.5 },
    elements: [
      {
        id: 'quality-ring',
        name: 'Quality Ring',
        type: 'ring',
        role: 'ring',
        params: { radius: 48, width: 2.8 },
        effect3d: {
          enabled: true,
          mode: 'outer',
          intensity: 0.7,
          opacity: 0.9,
          angle: -35,
          distance: 2,
          falloff: 1,
          whiteBalance: 0,
          spread: 0.2,
        },
        dropShadow: {
          enabled: true,
          mode: 'outer',
          color: '#000000',
          opacity: 0.6,
          blur: 12,
          offsetX: 5,
          offsetY: 3,
        },
        texture: {
          enabled: true,
          kind: 'noise',
          opacity: 0.5,
          blur: {
            enabled: true,
            type: 'gaussian',
            amount: 8,
            samples: 8,
            strength: 0.7,
          },
        },
        placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
        symmetry: { mode: 'none', config: {} },
      },
    ],
  };
}

describe('render quality mode', () => {
  it('uses final mode by default and keeps expensive passes active', () => {
    const svg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: createQualityTemplate(),
    });

    expect(svg).toContain('result="dropShadow"');
    expect(svg).toContain('result="depthA"');
    expect(svg).toMatch(/stdDeviation="8\.000" result="texture-[^"]*-gauss"/);
  });

  it('reduces expensive passes in preview mode only', () => {
    const svg = runEngine({
      activeStyle: 'gold_dark',
      templateInput: createQualityTemplate(),
      renderQualityMode: 'preview',
    });

    // Spec 085 Phase 2 hotfix: shadow now always renders (was: not.toContain)
    expect(svg).toContain('result="dropShadow"');
    expect(svg).not.toContain('result="depthA"');
    expect(svg).not.toContain('result="texture-overlay-0-gauss"');
  });
});
