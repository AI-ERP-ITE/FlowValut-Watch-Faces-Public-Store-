import { describe, expect, it } from 'vitest';
import { getStorePreviewPaths } from './storePreview';

describe('getStorePreviewPaths', () => {
  it('keeps distinct Main and AOD paths', () => {
    expect(getStorePreviewPaths({
      previewPath: 'preview/face-main.png',
      aodPreviewPath: 'preview/face-aod.png',
    })).toEqual({
      main: 'preview/face-main.png',
      aod: 'preview/face-aod.png',
    });
  });

  it('uses Main as the legacy AOD fallback', () => {
    expect(getStorePreviewPaths({ previewPath: 'preview/legacy.png' })).toEqual({
      main: 'preview/legacy.png',
      aod: 'preview/legacy.png',
    });
  });
});
