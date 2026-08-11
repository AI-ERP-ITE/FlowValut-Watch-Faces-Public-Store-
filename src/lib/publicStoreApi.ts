import type { CatalogEntry } from '@/context/CatalogContext';

const PUBLIC_BASE_URL =
  (import.meta.env.VITE_FIREBASE_FUNCTIONS_BASE_URL as string | undefined)?.trim() ||
  (import.meta.env.VITE_PURCHASE_FUNCTIONS_BASE_URL as string | undefined)?.trim() ||
  (import.meta.env.VITE_GITHUB_FUNCTIONS_BASE_URL as string | undefined)?.trim();

function requirePublicBaseUrl(): string {
  if (!PUBLIC_BASE_URL) {
    throw new Error('Catalog backend is not configured. Missing VITE_PURCHASE_FUNCTIONS_BASE_URL.');
  }
  return PUBLIC_BASE_URL.replace(/\/$/, '');
}

export async function fetchPublicConfig<T>(file: 'models' | 'specGroups'): Promise<T> {
  const response = await fetch(`${requirePublicBaseUrl()}/publicConfig?file=${file}`);
  if (!response.ok) throw new Error(`Failed to load ${file}.json from config`);
  return response.json() as Promise<T>;
}

export async function fetchCatalogFromFirebase(): Promise<CatalogEntry[]> {
  const response = await fetch(`${requirePublicBaseUrl()}/publicCatalog`, { method: 'GET' });
  const payload = (await response.json().catch(() => null)) as
    | { entries?: CatalogEntry[]; error?: string }
    | null;
  if (!response.ok) throw new Error(payload?.error || `Catalog request failed (${response.status})`);
  return Array.isArray(payload?.entries) ? payload.entries : [];
}

export async function fetchStorefrontConfigFromFirebase(): Promise<{ featuredFaceId: string | null }> {
  const response = await fetch(`${requirePublicBaseUrl()}/publicStorefrontConfig`, { method: 'GET' });
  const payload = (await response.json().catch(() => null)) as { featuredFaceId?: string | null; error?: string } | null;
  if (!response.ok) throw new Error(payload?.error || `Storefront config request failed (${response.status})`);
  return { featuredFaceId: typeof payload?.featuredFaceId === 'string' ? payload.featuredFaceId : null };
}
