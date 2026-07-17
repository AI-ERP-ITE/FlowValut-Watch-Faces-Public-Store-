import { describe, expect, it } from 'vitest';
import { dataUrlToBlob } from './workshopApi';

describe('workshopApi artifact conversion', () => {
  it('converts base64 previews to binary blobs without JSON expansion', async () => {
    const blob = dataUrlToBlob('data:image/png;base64,AQID');
    expect(blob.type).toBe('image/png');
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([1, 2, 3]);
  });
});

