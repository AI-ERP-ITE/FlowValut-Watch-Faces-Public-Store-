import { adminFetch } from '@/lib/studioFirebasePublishApi';
import { generateQRCode } from '@/lib/qrGenerator';

interface UploadTarget {
  url: string;
  contentType: string;
}

interface BuildSession {
  projectId: string;
  buildId: string;
  buildNumber: number;
  uploads: {
    fvwf: UploadTarget;
    zpk: UploadTarget;
    qr: UploadTarget;
    mainPreview?: UploadTarget;
    aodPreview?: UploadTarget;
  };
  installUrl: string;
}

async function uploadSignedArtifact(kind: string, target: UploadTarget, blob: Blob): Promise<void> {
  try {
    const response = await fetch(target.url, {
      method: 'PUT',
      headers: { 'Content-Type': target.contentType },
      body: blob,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'network error';
    throw new Error(`Workshop ${kind} upload failed: ${detail}`);
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/i);
  if (!match) throw new Error('Invalid data URL');
  const contentType = match[1] || 'application/octet-stream';
  const payload = match[2] || '';
  const bytes = dataUrl.includes(';base64,')
    ? Uint8Array.from(atob(payload), (char) => char.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(payload));
  return new Blob([bytes], { type: contentType });
}

export async function createWorkshopProject(input: {
  workingTitle?: string;
  folder?: string;
  notes?: string;
  tags?: string[];
  targetDeviceId?: string;
}): Promise<{ projectId: string; workingTitle: string }> {
  return adminFetch<{ projectId: string; workingTitle: string }>('workshopCreateProject', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function createWorkshopBuild(input: {
  projectId: string;
  workshopLabel: string;
  resolution: { width: number; height: number };
  specGroup?: string;
  deviceId?: string;
  notes?: string;
  parentBuildId?: string;
  fvwf: Blob;
  zpk: Blob;
  mainPreview?: Blob;
  aodPreview?: Blob;
}): Promise<{
  projectId: string;
  buildId: string;
  buildNumber: number;
  storageBytes: number;
  installUrl: string;
  qrDataUrl: string;
}> {
  const session = await adminFetch<BuildSession>('workshopCreateBuildSession', {
    method: 'POST',
    body: JSON.stringify({
      projectId: input.projectId,
      workshopLabel: input.workshopLabel,
      resolution: input.resolution,
      specGroup: input.specGroup,
      deviceId: input.deviceId,
      notes: input.notes,
      parentBuildId: input.parentBuildId,
      hasMainPreview: Boolean(input.mainPreview),
      hasAodPreview: Boolean(input.aodPreview),
    }),
  });
  try {
    const qrDataUrl = await generateQRCode(session.installUrl);
    await Promise.all([
      uploadSignedArtifact('FVWF', session.uploads.fvwf, input.fvwf),
      uploadSignedArtifact('ZPK', session.uploads.zpk, input.zpk),
      uploadSignedArtifact('QR', session.uploads.qr, dataUrlToBlob(qrDataUrl)),
      ...(input.mainPreview && session.uploads.mainPreview
        ? [uploadSignedArtifact('main preview', session.uploads.mainPreview, input.mainPreview)]
        : []),
      ...(input.aodPreview && session.uploads.aodPreview
        ? [uploadSignedArtifact('AOD preview', session.uploads.aodPreview, input.aodPreview)]
        : []),
    ]);
    const finalized = await adminFetch<{ storageBytes: number }>('workshopFinalizeBuild', {
      method: 'POST',
      body: JSON.stringify({ projectId: input.projectId, buildId: session.buildId }),
    });
    try {
      const channel = new BroadcastChannel('workshop_events');
      channel.postMessage({ type: 'WORKSHOP_BUILD_CREATED', projectId: input.projectId, buildId: session.buildId });
      channel.close();
    } catch (error) {
      console.warn('BroadcastChannel failed', error);
    }
    return { ...session, projectId: input.projectId, storageBytes: finalized.storageBytes, qrDataUrl };
  } catch (error) {
    try {
      await adminFetch('workshopAbortBuild', {
        method: 'POST',
        body: JSON.stringify({ projectId: input.projectId, buildId: session.buildId }),
      });
    } catch (abortError) {
      console.error('Workshop reservation cleanup failed', abortError);
    }
    throw error;
  }
}
