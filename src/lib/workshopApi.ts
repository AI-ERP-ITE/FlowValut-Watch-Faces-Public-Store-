import { adminFetch } from '@/lib/studioFirebasePublishApi';

export interface WorkshopBuildSummary {
  id: string;
  projectId: string;
  buildNumber: number;
  workshopLabel: string;
  state: 'TESTING' | 'APPROVED' | 'PROMOTED' | 'TRASHED';
  resolution: { width: number; height: number };
  specGroup?: string;
  storageBytes: number;
  createdAt: string | null;
}

export interface WorkshopProjectSummary {
  id: string;
  workingTitle: string;
  buildCount: number;
  storageBytes: number;
  currentBuildId?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  builds: WorkshopBuildSummary[];
  folder?: string;
  notes?: string;
  tags?: string[];
}

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
    mainPreview?: UploadTarget;
    aodPreview?: UploadTarget;
  };
}

async function uploadSignedArtifact(target: UploadTarget, blob: Blob): Promise<void> {
  const response = await fetch(target.url, {
    method: 'PUT',
    headers: { 'Content-Type': target.contentType },
    body: blob,
  });
  if (!response.ok) throw new Error(`Workshop artifact upload failed (${response.status})`);
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

export async function updateWorkshopProject(input: { projectId: string; workingTitle: string; folder?: string; notes?: string; tags?: string[] }): Promise<void> {
  await adminFetch('workshopUpdateProject', { method: 'POST', body: JSON.stringify(input) });
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
}): Promise<{ projectId: string; buildId: string; buildNumber: number; storageBytes: number }> {
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
    await Promise.all([
      uploadSignedArtifact(session.uploads.fvwf, input.fvwf),
      uploadSignedArtifact(session.uploads.zpk, input.zpk),
      ...(input.mainPreview && session.uploads.mainPreview
        ? [uploadSignedArtifact(session.uploads.mainPreview, input.mainPreview)]
        : []),
      ...(input.aodPreview && session.uploads.aodPreview
        ? [uploadSignedArtifact(session.uploads.aodPreview, input.aodPreview)]
        : []),
    ]);

    const finalized = await adminFetch<{ storageBytes: number }>('workshopFinalizeBuild', {
      method: 'POST',
      body: JSON.stringify({ projectId: session.projectId, buildId: session.buildId }),
    });
    return { ...session, storageBytes: finalized.storageBytes };
  } catch (error) {
    try {
      await adminFetch('workshopAbortBuild', {
        method: 'POST',
        body: JSON.stringify({ projectId: session.projectId, buildId: session.buildId }),
      });
    } catch (abortError) {
      console.error('Workshop reservation cleanup failed', abortError);
    }
    throw error;
  }
}

export async function fetchWorkshopProjects(): Promise<WorkshopProjectSummary[]> {
  const result = await adminFetch<{ projects?: WorkshopProjectSummary[] }>('workshopList', { method: 'GET' });
  return Array.isArray(result.projects) ? result.projects : [];
}

export async function getWorkshopArtifactUrl(input: {
  projectId: string;
  buildId: string;
  kind: 'fvwf' | 'zpk' | 'mainPreview' | 'aodPreview';
}): Promise<string> {
  const result = await adminFetch<{ url: string }>('workshopArtifactAccess', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return result.url;
}

export async function fetchWorkshopProjectFile(projectId: string, buildId: string): Promise<string> {
  const url = await getWorkshopArtifactUrl({ projectId, buildId, kind: 'fvwf' });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load Workshop project (${response.status})`);
  return response.text();
}

export async function approveWorkshopBuild(projectId: string, buildId: string): Promise<void> {
  await adminFetch('workshopSetBuildState', {
    method: 'POST',
    body: JSON.stringify({ projectId, buildId, state: 'APPROVED' }),
  });
}

export async function setWorkshopBuildLifecycle(projectId: string, buildId: string, action: 'TRASH' | 'RESTORE', reason?: string): Promise<{ state: WorkshopBuildSummary['state'] }> {
  return adminFetch('adminWorkshopBuildLifecycle', {
    method: 'POST',
    body: JSON.stringify({ projectId, buildId, action, reason }),
  });
}

export async function permanentlyDeleteWorkshopBuild(projectId: string, buildId: string, confirmation: string): Promise<void> {
  await adminFetch('adminWorkshopBuildPermanentDelete', {
    method: 'POST',
    body: JSON.stringify({ projectId, buildId, confirmation }),
  });
}
