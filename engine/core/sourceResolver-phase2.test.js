import { describe, expect, it } from 'vitest';
import { runEngine } from '../index.js';

const PNG = 'data:image/png;base64,AAAA';

function makeComposition({ renderSourceMode, mask, dropShadow, snapshot }) {
  return {
    layout: { shape: 'circle', width: 454, height: 454, padding: 0, baseRadius: 0.5 },
    elements: [
      {
        id: 'ring-1',
        name: 'Ring 1',
        type: 'ring',
        role: 'ring',
        params: { radius: 44, width: 2.2, fill: '#bfa66a' },
        placement: { mode: 'center', config: { offset: [0, 0], rotation: 0 } },
        symmetry: { mode: 'none', config: {} },
        ...(mask ? { mask } : {}),
        ...(dropShadow ? { dropShadow } : {}),
        renderState: {
          renderSourceMode,
          maskEmbeddedInSnapshot: renderSourceMode === 'baked-baked-mask',
          sourceMode: renderSourceMode === 'procedural' ? 'live' : 'snapshot',
          snapshotStatus: renderSourceMode === 'procedural' ? 'missing' : 'fresh',
          snapshot: snapshot || null,
        },
      },
    ],
  };
}

describe('Spec 085 Phase 2 - renderer routes shadow per resolver', () => {
  it('preview quality: procedural element KEEPS shadow (hotfix: no preview gate)', () => {
    const svg = runEngine({
      templateInput: makeComposition({
        renderSourceMode: 'procedural',
        snapshot: null,
        dropShadow: { enabled: true, mode: 'outer', color: '#000', opacity: 0.3, blur: 4, offsetX: 2, offsetY: 2 },
      }),
      renderQualityMode: 'preview',
    });
    expect(svg).toMatch(/dsOuterBlur|dsInnerBlur/);
  });

  it('preview quality: baked-live-mask element KEEPS shadow enabled', () => {
    const svg = runEngine({
      templateInput: makeComposition({
        renderSourceMode: 'baked-live-mask',
        mask: { kind: 'circle', enabled: true, radius: 50 },
        snapshot: { imageDataUrl: PNG, width: 100, height: 100, sourceHash: 'h1' },
        dropShadow: { enabled: true, mode: 'outer', color: '#000', opacity: 0.3, blur: 4, offsetX: 2, offsetY: 2 },
      }),
      renderQualityMode: 'preview',
    });
    expect(svg).toMatch(/dsOuterBlur|dsInnerBlur|silhouetteAlpha/);
  });

  it('preview quality: baked-baked-mask element KEEPS shadow enabled', () => {
    const svg = runEngine({
      templateInput: makeComposition({
        renderSourceMode: 'baked-baked-mask',
        snapshot: { imageDataUrl: PNG, width: 100, height: 100, sourceHash: 'h2' },
        dropShadow: { enabled: true, mode: 'outer', color: '#000', opacity: 0.3, blur: 4, offsetX: 2, offsetY: 2 },
      }),
      renderQualityMode: 'preview',
    });
    expect(svg).toMatch(/dsOuterBlur|dsInnerBlur|silhouetteAlpha/);
  });

  it('full quality: procedural element shadow remains enabled (no regression)', () => {
    const svg = runEngine({
      templateInput: makeComposition({
        renderSourceMode: 'procedural',
        snapshot: null,
        dropShadow: { enabled: true, mode: 'outer', color: '#000', opacity: 0.3, blur: 4, offsetX: 2, offsetY: 2 },
      }),
      renderQualityMode: 'final',
    });
    expect(svg).toMatch(/dsOuterBlur|dsInnerBlur/);
  });
});
