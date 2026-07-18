import { beforeEach, describe, expect, it, vi } from 'vitest';

const { adminFetchMock } = vi.hoisted(() => ({ adminFetchMock: vi.fn() }));
vi.mock('./studioFirebasePublishApi', () => ({ adminFetch: adminFetchMock }));

import { createWorkshopBuild, dataUrlToBlob } from './workshopApi';

describe('workshopApi artifact conversion', () => {
  beforeEach(() => {
    adminFetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('converts base64 previews to binary blobs without JSON expansion', async () => {
    const blob = dataUrlToBlob('data:image/png;base64,AQID');
    expect(blob.type).toBe('image/png');
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([1, 2, 3]);
  });

  it('passes parent lineage and finalizes only after both required artifacts upload', async () => {
    adminFetchMock
      .mockResolvedValueOnce({ projectId: 'project-1', buildId: 'build-0002', buildNumber: 2, uploads: { fvwf: { url: 'https://upload/fvwf', contentType: 'application/json' }, zpk: { url: 'https://upload/zpk', contentType: 'application/octet-stream' } } })
      .mockResolvedValueOnce({ storageBytes: 12 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const result = await createWorkshopBuild({ projectId: 'project-1', parentBuildId: 'build-0001', workshopLabel: 'Trial 2', resolution: { width: 480, height: 480 }, fvwf: new Blob(['{}']), zpk: new Blob(['zpk']) });

    expect(JSON.parse(adminFetchMock.mock.calls[0][1].body)).toMatchObject({ parentBuildId: 'build-0001' });
    expect(adminFetchMock.mock.calls[1][0]).toBe('workshopFinalizeBuild');
    expect(result.storageBytes).toBe(12);
  });

  it('aborts the reserved build when an artifact upload fails', async () => {
    adminFetchMock
      .mockResolvedValueOnce({ projectId: 'project-1', buildId: 'build-0003', buildNumber: 3, uploads: { fvwf: { url: 'https://upload/fvwf', contentType: 'application/json' }, zpk: { url: 'https://upload/zpk', contentType: 'application/octet-stream' } } })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, status: 500 }));

    await expect(createWorkshopBuild({ projectId: 'project-1', workshopLabel: 'Broken', resolution: { width: 480, height: 480 }, fvwf: new Blob(['{}']), zpk: new Blob(['zpk']) })).rejects.toThrow('Workshop artifact upload failed');
    expect(adminFetchMock.mock.calls[1][0]).toBe('workshopAbortBuild');
    expect(JSON.parse(adminFetchMock.mock.calls[1][1].body)).toEqual({ projectId: 'project-1', buildId: 'build-0003' });
  });
});
