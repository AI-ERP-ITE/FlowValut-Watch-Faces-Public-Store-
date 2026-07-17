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
});

