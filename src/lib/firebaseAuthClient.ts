import { initializeApp, getApps } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';

interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

function getFirebaseConfig(): FirebaseWebConfig | null {
  const apiKey = (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined)?.trim();
  const authDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined)?.trim();
  const projectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined)?.trim();
  const appId = (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined)?.trim();

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

export async function signInAdminWithGoogle(): Promise<void> {
  const auth = ensureFirebaseApp();
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
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
