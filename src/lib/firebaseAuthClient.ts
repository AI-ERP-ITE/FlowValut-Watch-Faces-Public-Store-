import { initializeApp, getApps } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';

interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

const FALLBACK_FIREBASE_CONFIG: FirebaseWebConfig = {
  apiKey: 'AIzaSyCz6av7Wqu4yEE_ATEgN3ObFrPtnPj65Zk',
  authDomain: 'zeppfaceloader-b0b106e9.firebaseapp.com',
  projectId: 'zeppfaceloader-b0b106e9',
  appId: '1:63546256310:web:ba4ae563ed321776e9ef17',
};

function getFirebaseConfig(): FirebaseWebConfig | null {
  const apiKey =
    (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined)?.trim() ||
    FALLBACK_FIREBASE_CONFIG.apiKey;
  const authDomain =
    (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined)?.trim() ||
    FALLBACK_FIREBASE_CONFIG.authDomain;
  const projectId =
    (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined)?.trim() ||
    FALLBACK_FIREBASE_CONFIG.projectId;
  const appId =
    (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined)?.trim() ||
    FALLBACK_FIREBASE_CONFIG.appId;

  if (!apiKey || !authDomain || !projectId || !appId) {
    return null;
  }

  return { apiKey, authDomain, projectId, appId };
}

function ensureFirebaseApp() {
  const cfg = getFirebaseConfig();
  if (!cfg) {
    throw new Error('Firebase Auth is not configured. Missing VITE_FIREBASE_* env vars.');
  }
  if (getApps().length === 0) {
    initializeApp(cfg);
  }
  return getAuth();
}

export function isFirebaseAuthConfigured(): boolean {
  return !!getFirebaseConfig();
}

export function subscribeAuthState(listener: (user: User | null) => void): () => void {
  const auth = ensureFirebaseApp();
  return onAuthStateChanged(auth, listener);
}

function toAuthErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code || '')
    : '';

  if (code === 'auth/popup-blocked') {
    return 'Popup was blocked by the browser. Retrying with redirect sign-in...';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in popup was closed before completion. Retrying with redirect sign-in...';
  }
  if (code === 'auth/cancelled-popup-request') {
    return 'Another sign-in popup request was already in progress. Please try again.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized in Firebase Authentication settings.';
  }

  return error instanceof Error ? error.message : 'Sign-in failed.';
}

export async function signInAdminWithGoogle(): Promise<{ method: 'popup' | 'redirect' }> {
  const auth = ensureFirebaseApp();
  const provider = new GoogleAuthProvider();

  try {
    await signInWithPopup(auth, provider);
    return { method: 'popup' };
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

    // Embedded browsers can block popup close/handshake; redirect is a safe fallback.
    if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, provider);
      return { method: 'redirect' };
    }

    throw new Error(toAuthErrorMessage(error));
  }
}

export async function startGoogleRedirectSignIn(): Promise<void> {
  const auth = ensureFirebaseApp();
  const provider = new GoogleAuthProvider();
  await signInWithRedirect(auth, provider);
}

export async function completeRedirectSignIn(): Promise<void> {
  const auth = ensureFirebaseApp();
  await getRedirectResult(auth);
}

export async function signOutAdmin(): Promise<void> {
  const auth = ensureFirebaseApp();
  await signOut(auth);
}

export async function getFirebaseIdToken(): Promise<string> {
  const auth = ensureFirebaseApp();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not signed in. Sign in with Firebase first.');
  }
  return user.getIdToken();
}

export function getCurrentAuthUser(): User | null {
  const cfg = getFirebaseConfig();
  if (!cfg) return null;
  const auth = ensureFirebaseApp();
  return auth.currentUser;
}
