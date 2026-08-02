import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../StudioApp.tsx', import.meta.url), 'utf8');

describe('in-canvas watch-model conversion', () => {
  it('offers configured models inside the loaded canvas and uses project rearrangement', () => {
    expect(source).toContain('Convert current project to another watch model');
    expect(source).toContain('handleCanvasModelChange');
    expect(source).toContain('rearrangeProjectPositions(sourceConfig, target.resolution, target.name)');
    expect(source).toContain('setAodElements(converted.aodElements');
  });

  it('resizes and restores both MAIN and uploaded AOD backgrounds', () => {
    expect(source).toContain("resizeDataUrl(state.backgroundImage, target.resolution.width, target.resolution.height)");
    expect(source).toContain("resizeDataUrl(aodBackgroundImage, target.resolution.width, target.resolution.height)");
    expect(source).toContain('setAodBackgroundImage(chosenAodBackgroundImage)');
    expect(source).toContain('artifact.aodBackgroundImage ?? null');
  });
});
