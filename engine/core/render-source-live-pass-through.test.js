import { describe, expect, it } from 'vitest';
import { runEngine } from '../index.js';

function createTemplate(includeLiveRenderState) {
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
        ...(includeLiveRenderState
          ? {
              renderState: {
                sourceMode: 'live',
                snapshotStatus: 'missing',
                snapshot: null,
              },
            }
          : {}),
      },
    ],
  };
}

describe('render source live pass-through', () => {
  it('keeps procedural output unchanged when sourceMode is live', () => {
    const baseSvg = runEngine({ templateInput: createTemplate(false) });
    const liveSvg = runEngine({ templateInput: createTemplate(true) });

    expect(liveSvg).toBe(baseSvg);
  });
});
