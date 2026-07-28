import { getFirebaseIdToken } from '@/lib/firebaseAuthClient';
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

export interface EditableWorkshopResult {
  projectId: string;
  buildId: string;
  buildNumber: number;
  installUrl: string;
  qrDataUrl: string;
}

function backendBaseUrl(): string {
  const value =
    (import.meta.env.VITE_FIREBASE_FUNCTIONS_BASE_URL as string | undefined)?.trim()
    || (import.meta.env.VITE_GITHUB_FUNCTIONS_BASE_URL as string | undefined)?.trim();
  if (!value) throw new Error('Backend bridge is required. Missing VITE_FIREBASE_FUNCTIONS_BASE_URL.');
  return value.replace(/\/$/, '');
}

async function adminFetch<T>(endpoint: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${backendBaseUrl()}/${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await getFirebaseIdToken()}`,
      ...(init.headers || {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null;
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? payload.error
      : `Request failed (${response.status})`;
    throw new Error(message || `Request failed (${response.status})`);
  }
  if (!payload) throw new Error('Invalid backend response.');
  return payload as T;
}

async function uploadArtifact(kind: string, target: UploadTarget, blob: Blob): Promise<void> {
  const response = await fetch(target.url, {
    method: 'PUT',
    headers: { 'Content-Type': target.contentType },
    body: blob,
  });
  if (!response.ok) throw new Error(`Workshop ${kind} upload failed: HTTP ${response.status}`);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/i);
  if (!match) throw new Error('Invalid preview data URL.');
  const type = match[1] || 'application/octet-stream';
  const bytes = dataUrl.includes(';base64,')
    ? Uint8Array.from(atob(match[2] || ''), (char) => char.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(match[2] || ''));
  return new Blob([bytes], { type });
}

export async function publishEditableWorkshop(input: {
  projectId?: string | null;
  workingTitle: string;
  targetDeviceId?: string;
  resolution: { width: number; height: number };
  specGroup: string;
  fvwc: Blob;
  zpk: Blob;
  mainPreview: string;
  aodPreview?: string | null;
}): Promise<EditableWorkshopResult> {
  let projectId = input.projectId;
  if (!projectId) {
    const project = await adminFetch<{ projectId: string }>('workshopCreateProject', {
      method: 'POST',
      body: JSON.stringify({
        workingTitle: input.workingTitle,
        tags: ['editable-watchface', 'fvwc'],
        targetDeviceId: input.targetDeviceId,
      }),
    });
    projectId = project.projectId;
  }

  const session = await adminFetch<BuildSession>('workshopCreateBuildSession', {
    method: 'POST',
    body: JSON.stringify({
      projectId,
      workshopLabel: input.workingTitle,
      resolution: input.resolution,
      specGroup: input.specGroup,
      deviceId: input.targetDeviceId,
      notes: 'System B editable watchface; source artifact uses FVWC schema.',
      hasMainPreview: true,
      hasAodPreview: Boolean(input.aodPreview),
    }),
  });

  try {
    const qrDataUrl = await generateQRCode(session.installUrl);
    await Promise.all([
      uploadArtifact('FVWC source', session.uploads.fvwf, input.fvwc),
      uploadArtifact('ZPK', session.uploads.zpk, input.zpk),
      uploadArtifact('QR', session.uploads.qr, dataUrlToBlob(qrDataUrl)),
      ...(session.uploads.mainPreview
        ? [uploadArtifact('main preview', session.uploads.mainPreview, dataUrlToBlob(input.mainPreview))]
        : []),
      ...(input.aodPreview && session.uploads.aodPreview
        ? [uploadArtifact('AOD preview', session.uploads.aodPreview, dataUrlToBlob(input.aodPreview))]
        : []),
    ]);
    await adminFetch('workshopFinalizeBuild', {
      method: 'POST',
      body: JSON.stringify({ projectId, buildId: session.buildId }),
    });
    try {
      const channel = new BroadcastChannel('workshop_events');
      channel.postMessage({ type: 'WORKSHOP_BUILD_CREATED', projectId, buildId: session.buildId });
      channel.close();
    } catch {
      // Broadcast is only an Admin refresh optimization.
    }
    return { ...session, projectId, qrDataUrl };
  } catch (error) {
    await adminFetch('workshopAbortBuild', {
      method: 'POST',
      body: JSON.stringify({ projectId, buildId: session.buildId }),
    }).catch(() => undefined);
    throw error;
  }
}
