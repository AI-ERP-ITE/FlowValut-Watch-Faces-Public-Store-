import { getFirebaseIdToken } from '@/lib/firebaseAuthClient';

export function getBackendBridgeBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_GITHUB_FUNCTIONS_BASE_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return '';
}

export function isBackendBridgeConfigured(): boolean {
  return !!getBackendBridgeBaseUrl();
}

async function buildAuthHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const token = await getFirebaseIdToken();
  return {
    ...(extra ?? {}),
    Authorization: `Bearer ${token}`,
  };
}

async function backendFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = getBackendBridgeBaseUrl();
  if (!base) {
    throw new Error('Backend bridge is required for GitHub writes');
  }
  const finalUrl = `${base}/${path.replace(/^\//, '')}`;
  const authHeaders = await buildAuthHeaders();

  const mergedHeaders: Record<string, string> = {
    ...authHeaders,
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };

  return fetch(finalUrl, {
    ...(init ?? {}),
    headers: mergedHeaders,
  });
}

export async function fetchBackendRepoInfo(): Promise<{ name: string; description: string; html_url: string; has_pages: boolean }> {
  const response = await backendFetch('githubRepoInfo');
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Backend repo info failed: HTTP ${response.status} ${text}`.trim());
  }
  return response.json() as Promise<{ name: string; description: string; html_url: string; has_pages: boolean }>;
}

export async function bridgeReadContent(path: string, ref?: string): Promise<{ exists: boolean; content?: string; sha?: string }> {
  const params = new URLSearchParams({ path });
  if (ref) params.set('ref', ref);
  const response = await backendFetch(`githubContentBridge?${params.toString()}`);

  if (response.status === 404) {
    return { exists: false };
  }
  if (!response.ok) {
    throw new Error(`Backend content read failed: HTTP ${response.status}`);
  }

  return response.json() as Promise<{ exists: boolean; content?: string; sha?: string }>;
}

export async function bridgeWriteContent(input: {
  path: string;
  contentBase64: string;
  message: string;
  branch?: string;
  sha?: string;
}): Promise<void> {
  const response = await backendFetch('githubContentBridge', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Backend content write failed: HTTP ${response.status} ${text}`.trim());
  }
}

export async function fetchLabManifest(type: 'icons' | 'hands' | 'fonts'): Promise<unknown> {
  const response = await backendFetch(`labAssetsSync?type=${encodeURIComponent(type)}`);
  if (!response.ok) {
    throw new Error(`Lab sync pull failed: HTTP ${response.status}`);
  }
  return response.json();
}

export async function writeLabManifest(type: 'icons' | 'hands' | 'fonts', payload: unknown): Promise<void> {
  const response = await backendFetch(`labAssetsSync?type=${encodeURIComponent(type)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Lab sync push failed: HTTP ${response.status} ${text}`.trim());
  }
}
