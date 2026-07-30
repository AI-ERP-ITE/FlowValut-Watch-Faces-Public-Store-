import { describe, expect, it } from 'vitest';
import type { WatchFaceConfig } from '@/types';
import {
  createProjectFileArtifact,
  parseProjectFileArtifact,
  serializeProjectFileArtifact,
} from './projectFileArtifact';

const config = {
  name: 'Workshop test',
  watchModel: 'Amazfit Balance 2',
  resolution: { width: 480, height: 480 },
  elements: [],
} as unknown as WatchFaceConfig;

describe('projectFileArtifact', () => {
  it('round-trips the exact wrapped FVWF editor payload', () => {
    const artifact = createProjectFileArtifact(config, 'data:image/png;base64,abc');
    expect(parseProjectFileArtifact(serializeProjectFileArtifact(artifact))).toEqual(artifact);
  });

  it('retains compatibility with bare WatchFaceConfig project files', () => {
    expect(parseProjectFileArtifact(JSON.stringify(config))).toEqual({
      version: 1,
      backgroundImage: null,
      watchFaceConfig: config,
    });
  });

  it('round-trips the export-only watch-safe label toggle', () => {
    const watchSafeConfig = structuredClone(config);
    watchSafeConfig.elements = [{
      id: 'month',
      type: 'IMG_DATE',
      subtype: 'month',
      name: 'Month',
      bounds: { x: 10, y: 20, width: 60, height: 21 },
      visible: true,
      zIndex: 1,
      watchSafeTextEdges: true,
    }];
    const restored = parseProjectFileArtifact(
      serializeProjectFileArtifact(createProjectFileArtifact(watchSafeConfig, null)),
    );
    expect(restored.watchFaceConfig.elements[0].watchSafeTextEdges).toBe(true);
  });
});
