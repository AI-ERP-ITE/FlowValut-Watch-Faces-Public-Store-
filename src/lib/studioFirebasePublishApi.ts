import { getFirebaseIdToken } from '@/lib/firebaseAuthClient';
import type { CatalogEntry } from '@/context/CatalogContext';

const ADMIN_BASE_URL =
  (import.meta.env.VITE_FIREBASE_FUNCTIONS_BASE_URL as string | undefined)?.trim() ||
  (import.meta.env.VITE_GITHUB_FUNCTIONS_BASE_URL as string | undefined)?.trim();
const PUBLIC_BASE_URL =
  (import.meta.env.VITE_FIREBASE_FUNCTIONS_BASE_URL as string | undefined)?.trim() ||
  (import.meta.env.VITE_PURCHASE_FUNCTIONS_BASE_URL as string | undefined)?.trim() ||
  (import.meta.env.VITE_GITHUB_FUNCTIONS_BASE_URL as string | undefined)?.trim();

function requireAdminBaseUrl(): string {
  if (!ADMIN_BASE_URL) {
    throw new Error('Backend bridge is required. Missing VITE_FIREBASE_FUNCTIONS_BASE_URL.');
  }
  return ADMIN_BASE_URL.replace(/\/$/, '');
}

function requirePublicBaseUrl(): string {
  if (!PUBLIC_BASE_URL) {
    throw new Error('Catalog backend is not configured. Missing VITE_PURCHASE_FUNCTIONS_BASE_URL.');
  }
  return PUBLIC_BASE_URL.replace(/\/$/, '');
}

async function adminFetch<T>(endpoint: string, init: RequestInit): Promise<T> {
  const token = await getFirebaseIdToken();
  const base = requireAdminBaseUrl();

  const response = await fetch(`${base}/${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null;

  if (!response.ok) {
    const msg = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : `Request failed (${response.status})`;
    throw new Error(msg);
  }

  if (!payload) {
    throw new Error('Invalid backend response');
  }

  return payload as T;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file as base64'));
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      if (!value) {
        reject(new Error('Base64 conversion failed'));
        return;
      }
      resolve(value);
    };
    reader.readAsDataURL(blob);
  });
}

export interface StudioUploadResult {
  ok: boolean;
  watchfaceId: string;
  downloadUrl?: string;
  qrMode?: 'KEEP_EXISTING' | 'REGENERATE';
  replacedAssets?: Array<'zpk' | 'source' | 'preview' | 'qr'>;
  paths: {
    zpkPath: string;
    previewPath: string;
    qrPath: string;
    sourcePath: string;
  };
}

export async function uploadStudioArtifactsToFirebase(input: {
  watchfaceId: string;
  zpkBlob: Blob;
  qrDataUrl?: string;
  qrMode?: 'KEEP_EXISTING' | 'REGENERATE';
  previewDataUrl?: string;
  sourceJson: unknown;
}): Promise<StudioUploadResult> {
  const zpkBase64 = await blobToBase64(input.zpkBlob);

  const payload = {
    watchfaceId: input.watchfaceId,
    zpkBase64,
    qrMode: input.qrMode || 'REGENERATE',
    qrBase64: input.qrDataUrl || null,
    previewBase64: input.previewDataUrl || null,
    sourceJson: input.sourceJson,
  };

  return adminFetch<StudioUploadResult>('studioUploadArtifacts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function publishStudioWatchfaceToFirebase(entry: {
  id: string;
  name: string;
  specGroup: string;
  categories: string[];
  hashtags: string[];
  basePrice: number;
  discountPercent: number;
  price: number;
  stripeLink: string | null;
  publishMode?: 'KEEP_QR' | 'REGENERATE_ALL';
  replacedAssets?: Array<'zpk' | 'source' | 'preview' | 'qr'>;
}): Promise<{
  ok: boolean;
  id: string;
  published: boolean;
  publishMode: 'KEEP_QR' | 'REGENERATE_ALL';
  replacedAssets: Array<'zpk' | 'source' | 'preview' | 'qr'>;
}> {
  return adminFetch<{
    ok: boolean;
    id: string;
    published: boolean;
    publishMode: 'KEEP_QR' | 'REGENERATE_ALL';
    replacedAssets: Array<'zpk' | 'source' | 'preview' | 'qr'>;
  }>('studioPublishWatchface', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

export async function fetchCatalogFromFirebase(): Promise<CatalogEntry[]> {
  const base = requirePublicBaseUrl();
  const response = await fetch(`${base}/publicCatalog`, { method: 'GET' });

  const payload = (await response.json().catch(() => null)) as
    | { entries?: CatalogEntry[]; error?: string }
    | null;

  if (!response.ok) {
    const msg = payload?.error || `Catalog request failed (${response.status})`;
    throw new Error(msg);
  }

  return Array.isArray(payload?.entries) ? payload.entries : [];
}

export async function upsertQrAssetInFirebase(input: {
  watchfaceId: string;
  qrDataUrl: string;
}): Promise<{ ok: boolean; watchfaceId: string; qrPath: string }> {
  return adminFetch<{ ok: boolean; watchfaceId: string; qrPath: string }>('adminUpsertQrAsset', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchStorefrontConfigFromFirebase(): Promise<{ featuredFaceId: string | null }> {
  const base = requirePublicBaseUrl();
  const response = await fetch(`${base}/publicStorefrontConfig`, { method: 'GET' });
  const payload = (await response.json().catch(() => null)) as { featuredFaceId?: string | null; error?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error || `Storefront config request failed (${response.status})`);
  }

  return {
    featuredFaceId: typeof payload?.featuredFaceId === 'string' ? payload.featuredFaceId : null,
  };
}

export async function writeStorefrontConfigToFirebase(input: {
  featuredFaceId: string | null;
}): Promise<{ ok: boolean; featuredFaceId: string | null }> {
  return adminFetch<{ ok: boolean; featuredFaceId: string | null }>('adminStorefrontConfig', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function patchCatalogSpecGroupsInFirebase(input: {
  validSpecGroups?: string[];
}): Promise<{ ok: boolean; total: number; patched: number; unknownAfter: number }> {
  return adminFetch<{ ok: boolean; total: number; patched: number; unknownAfter: number }>('adminPatchSpecGroups', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchAdminCatalogFromFirebase(): Promise<CatalogEntry[]> {
  return adminFetch<{ entries?: CatalogEntry[] }>('adminCatalogList', {
    method: 'GET',
  }).then((payload) => (Array.isArray(payload.entries) ? payload.entries : []));
}

export async function setCatalogStatusInFirebase(input: {
  watchfaceId: string;
  status: 'ENABLED' | 'OFFLINE';
}): Promise<{ ok: boolean; watchfaceId: string; status: 'ENABLED' | 'OFFLINE'; published: boolean }> {
  return adminFetch<{ ok: boolean; watchfaceId: string; status: 'ENABLED' | 'OFFLINE'; published: boolean }>('adminCatalogStatus', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchParametricLibraryFromFirebase(): Promise<Array<Record<string, unknown>>> {
  return adminFetch<{ entries?: Array<Record<string, unknown>> }>('userParametricLibraryGet', {
    method: 'GET',
  }).then((payload) => (Array.isArray(payload.entries) ? payload.entries : []));
}

export async function saveParametricLibraryToFirebase(input: {
  entries: Array<Record<string, unknown>>;
}): Promise<{ ok: boolean; count: number }> {
  return adminFetch<{ ok: boolean; count: number }>('userParametricLibrarySet', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchParametricThemesFromFirebase(): Promise<Array<Record<string, unknown>>> {
  return adminFetch<{ entries?: Array<Record<string, unknown>> }>('userParametricThemesGet', {
    method: 'GET',
  }).then((payload) => (Array.isArray(payload.entries) ? payload.entries : []));
}

export async function saveParametricThemesToFirebase(input: {
  entries: Array<Record<string, unknown>>;
}): Promise<{ ok: boolean; count: number }> {
  return adminFetch<{ ok: boolean; count: number }>('userParametricThemesSet', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
