import type { CatalogEntry } from '@/context/CatalogContext';
import { getPublicFunctionsBaseUrl } from '@/config/publicRuntimeConfig';

function requirePublicBaseUrl(): string {
  return getPublicFunctionsBaseUrl();
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
