import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';

const STAGING_APP_NAME = 'flowvault-staging-commerce-admin';
const STAGING_FUNCTIONS_BASE_URL =
  'https://us-central1-flowvault-staging-2026.cloudfunctions.net';

// Firebase web SDK configuration is public project metadata, not a server credential.
const STAGING_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCwymxXIFUQFbSnQy32zurRhzhgkiI1aec',
  authDomain: 'flowvault-staging-2026.firebaseapp.com',
  projectId: 'flowvault-staging-2026',
  storageBucket: 'flowvault-staging-2026.firebasestorage.app',
  appId: '1:826782624405:web:7af2d9ea157b38a0bf899c',
};

function stagingAuth() {
  const app = getApps().some((candidate) => candidate.name === STAGING_APP_NAME)
    ? getApp(STAGING_APP_NAME)
    : initializeApp(STAGING_FIREBASE_CONFIG, STAGING_APP_NAME);
  return getAuth(app);
}

export function subscribeStagingCommerceAuth(listener: (user: User | null) => void): () => void {
  return onAuthStateChanged(stagingAuth(), listener);
}

export async function connectStagingCommerceAdmin(): Promise<void> {
  const auth = stagingAuth();
  await setPersistence(auth, browserLocalPersistence);
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function disconnectStagingCommerceAdmin(): Promise<void> {
  await signOut(stagingAuth());
}

export async function stagingCommerceAdminFetch<T>(init: RequestInit): Promise<T> {
  return stagingAdminEndpointFetch<T>('adminVipPromoCodes', init);
}

export async function stagingAdminEndpointFetch<T>(endpoint: 'adminVipPromoCodes' | 'adminDeploymentSync', init: RequestInit): Promise<T> {
  const user = stagingAuth().currentUser;
  if (!user) throw new Error('Connect the Staging Commerce account first.');

  const response = await fetch(`${STAGING_FUNCTIONS_BASE_URL}/${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await user.getIdToken()}`,
      ...(init.headers || {}),
    },
  });
  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null;
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String(payload.error || `Request failed (${response.status})`)
      : `Request failed (${response.status})`;
    throw new Error(message);
  }
  if (!payload) throw new Error('Invalid staging commerce response.');
  return payload as T;
}
