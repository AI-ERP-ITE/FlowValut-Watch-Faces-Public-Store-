import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import models from '../../models.json';
import {
  createProjectFileArtifact,
  parseProjectFileArtifact,
  serializeProjectFileArtifact,
} from '@/lib/projectFileArtifact';
import { generateWatchFaceCode } from '@/lib/jsCodeGenerator';
import { resolveWatchModelTarget } from '@/lib/watchModelTarget';
import type { WatchFaceConfig } from '@/types';

const minimalConfig: WatchFaceConfig = {
  name: 'System B parity fixture',
  resolution: { width: 480, height: 480 },
  background: { src: 'background.png', format: 'TGA-P' },
  elements: [],
  aodElements: null,
  watchModel: 'Amazfit Balance 2',
};

describe('current System A V2 baseline copies', () => {
  it.each([
    ['components/InteractiveCanvas.tsx'],
    ['lib/zpkBuilder.ts'],
    ['lib/jsCodeGenerator.ts'],
    ['lib/handStyles.ts'],
    ['lib/customHandStore.ts'],
  ])('keeps %s byte-identical to System A', (relativePath) => {
    const systemA = readFileSync(path.resolve('..', 'src', relativePath));
    const systemB = readFileSync(path.resolve('src', relativePath));
    const hash = (value: Buffer) => createHash('sha256')
      .update(value.toString('utf8').replace(/\r\n/g, '\n'))
      .digest('hex');
    expect(hash(systemB)).toBe(hash(systemA));
  });

  it('round-trips FVWF V1 without changing the config', () => {
    const artifact = createProjectFileArtifact(minimalConfig, 'data:image/png;base64,AA==');
    const parsed = parseProjectFileArtifact(serializeProjectFileArtifact(artifact));

    expect(parsed.version).toBe(1);
    expect(parsed.watchFaceConfig).toEqual(minimalConfig);
    expect(parsed.backgroundImage).toBe(artifact.backgroundImage);
  });

  it('resolves the current canonical model target', () => {
    const result = resolveWatchModelTarget(
      'Amazfit Balance 2',
      models as Record<string, { name?: string; specGroup?: string }>,
    );

    expect(result).toEqual({ modelId: 'balance-2', specGroup: '480-round' });
  });

  it('generates only a normal V2 manifest baseline', () => {
    const generated = generateWatchFaceCode(minimalConfig);
    const appJson = JSON.parse(generated.appJson) as {
      configVersion: string;
      module: { watchface: { editable: number } };
    };

    expect(appJson.configVersion).toBe('v2');
    expect(appJson.module.watchface.editable).toBe(0);
    expect(generated.watchfaceIndexJs).not.toContain('WATCHFACE_EDIT_GROUP');
  });
});
