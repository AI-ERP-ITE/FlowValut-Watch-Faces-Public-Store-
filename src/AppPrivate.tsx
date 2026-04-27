import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import StudioApp from './StudioApp';
import LabPage from './LabPage';
import { AdminOpsPage } from '@/components/storefront/AdminOpsPage';
import {
  getCurrentAuthUser,
  isFirebaseAuthConfigured,
  signInAdminWithGoogle,
  subscribeAuthState,
} from '@/lib/firebaseAuthClient';

function PrivateRouteGuard({ children }: { children: ReactNode }) {
  const authConfigured = isFirebaseAuthConfigured();
  const [hasUser, setHasUser] = useState(() => !!getCurrentAuthUser());

  useEffect(() => {
    if (!authConfigured) return;
    return subscribeAuthState((user) => setHasUser(!!user));
  }, [authConfigured]);

  if (!authConfigured || !hasUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PrivateLoginPage() {
  const authConfigured = isFirebaseAuthConfigured();
  const [hasUser, setHasUser] = useState(() => !!getCurrentAuthUser());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!authConfigured) return;
    return subscribeAuthState((user) => setHasUser(!!user));
  }, [authConfigured]);

  if (hasUser) {
    return <Navigate to="/studio" replace />;
  }

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setErrorMessage(null);
      await signInAdminWithGoogle();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sign-in failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  if (!authConfigured) {
    return (
      <main className="min-h-screen grid place-items-center bg-black text-white p-6">
        <section className="w-full max-w-xl rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-xl font-semibold">Private Console Locked</h1>
          <p className="mt-3 text-zinc-300">
            Firebase Auth is not configured for this build. Set VITE_FIREBASE_* vars and redeploy the private bundle.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid place-items-center bg-black text-white p-6">
      <section className="w-full max-w-xl rounded-lg border border-zinc-800 bg-zinc-950 p-6">
        <h1 className="text-xl font-semibold">Private Console Sign In</h1>
        <p className="mt-3 text-zinc-300">Sign in with Firebase Google Auth to access Studio, Admin, and Tools.</p>
        {errorMessage ? <p className="mt-3 text-sm text-red-400">{errorMessage}</p> : null}
        <button
          type="button"
          className="mt-4 inline-flex items-center rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800 disabled:opacity-60"
          onClick={handleSignIn}
          disabled={isSigningIn}
        >
          {isSigningIn ? 'Signing in...' : 'Sign In With Google'}
        </button>
      </section>
    </main>
  );
}

export default function AppPrivate() {
  return (
    <Routes>
      <Route path="/login" element={<PrivateLoginPage />} />
      <Route path="/" element={<Navigate to="/studio" replace />} />
      <Route
        path="/studio"
        element={
          <PrivateRouteGuard>
            <StudioApp />
          </PrivateRouteGuard>
        }
      />
      <Route
        path="/studio/lab"
        element={
          <PrivateRouteGuard>
            <LabPage />
          </PrivateRouteGuard>
        }
      />
      <Route
        path="/admin"
        element={
          <PrivateRouteGuard>
            <AdminOpsPage />
          </PrivateRouteGuard>
        }
      />
      <Route
        path="/tools"
        element={
          <PrivateRouteGuard>
            <AdminOpsPage />
          </PrivateRouteGuard>
        }
      />
      <Route path="*" element={<Navigate to="/studio" replace />} />
    </Routes>
  );
}
