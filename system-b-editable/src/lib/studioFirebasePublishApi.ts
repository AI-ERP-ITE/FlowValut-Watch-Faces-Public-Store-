import { getFirebaseIdToken } from '@/lib/firebaseAuthClient';

const ADMIN_BASE_URL =
  (import.meta.env.VITE_FIREBASE_FUNCTIONS_BASE_URL as string | undefined)?.trim() ||
  (import.meta.env.VITE_GITHUB_FUNCTIONS_BASE_URL as string | undefined)?.trim();

export function requireAdminBaseUrl(): string {
  if (!ADMIN_BASE_URL) {
    throw new Error('Backend bridge is required. Missing VITE_FIREBASE_FUNCTIONS_BASE_URL.');
  }
  return ADMIN_BASE_URL.replace(/\/$/, '');
}

export async function adminFetch<T>(endpoint: string, init: RequestInit): Promise<T> {
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
    const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : `Request failed (${response.status})`;
    throw new Error(message);
  }
  if (!payload) throw new Error('Invalid backend response');
  return payload as T;
}
