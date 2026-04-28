import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import StudioApp from './StudioApp';
import LabPage from './LabPage';
import { AdminOpsPage } from '@/components/storefront/AdminOpsPage';
import {
  completeRedirectSignIn,
  getCurrentAuthUser,
  isFirebaseAuthConfigured,
  startGoogleRedirectSignIn,
  signInAdminWithGoogle,
  subscribeAuthState,
} from '@/lib/firebaseAuthClient';

function PrivateRouteGuard({ children }: { children: ReactNode }) {
  const authConfigured = isFirebaseAuthConfigured();
  const location = useLocation();
  const [hasUser, setHasUser] = useState(() => !!getCurrentAuthUser());

  useEffect(() => {
    if (!authConfigured) return;
    return subscribeAuthState((user) => setHasUser(!!user));
  }, [authConfigured]);

  if (!authConfigured || !hasUser) {
    const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <>{children}</>;
}

function PrivateLoginPage() {
  const authConfigured = isFirebaseAuthConfigured();
  const location = useLocation();
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;
  const [hasUser, setHasUser] = useState(() => !!getCurrentAuthUser());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const nextParam = new URLSearchParams(location.search).get('next');
  const nextPath =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('/login') ? nextParam : '/studio';

  useEffect(() => {
    if (!authConfigured) return;
    return subscribeAuthState((user) => setHasUser(!!user));
  }, [authConfigured]);

  useEffect(() => {
    let active = true;
    if (!authConfigured) return;

    (async () => {
      try {
        setIsSigningIn(true);
        await completeRedirectSignIn();
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : 'Sign-in failed.');
      } finally {
        if (active) setIsSigningIn(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [authConfigured]);

  if (hasUser) {
    return <Navigate to={nextPath} replace />;
  }

  const handleSignIn = async () => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      setIsSigningIn(true);
      setErrorMessage(null);
      const popupAttempt = signInAdminWithGoogle();
      const timeoutFallback = new Promise<{ method: 'redirect' }>((resolve, reject) => {
        timeoutId = setTimeout(async () => {
          try {
            setErrorMessage('Popup did not complete. Switching to redirect sign-in...');
            await startGoogleRedirectSignIn();
            resolve({ method: 'redirect' });
          } catch (error) {
            reject(error);
          }
        }, 7000);
      });

      const result = await Promise.race([popupAttempt, timeoutFallback]);
      if (result.method === 'redirect') {
        setErrorMessage('Continuing sign-in using redirect...');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sign-in failed.');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setIsSigningIn(false);
    }
  };

  const handleRedirectOnly = async () => {
    try {
      setIsSigningIn(true);
      setErrorMessage('Starting redirect sign-in...');
      await startGoogleRedirectSignIn();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Redirect sign-in failed.');
      setIsSigningIn(false);
    }
  };

  if (!authConfigured) {
    return (
      <main className="min-h-screen grid place-items-center bg-black text-white p-6">
        <section className="w-full max-w-xl rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <div className="mb-4 flex items-center gap-3">
            <img src={logoSrc} alt="Flowvault logo" className="h-10 w-auto" />
            <span className="text-sm uppercase tracking-widest text-zinc-400">Flowvault Private</span>
          </div>
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
        <div className="mb-4 flex items-center gap-3">
          <img src={logoSrc} alt="Flowvault logo" className="h-10 w-auto" />
          <span className="text-sm uppercase tracking-widest text-zinc-400">Flowvault Private</span>
        </div>
        <h1 className="text-xl font-semibold">Private Console Sign In</h1>
        <p className="mt-3 text-zinc-300">Sign in with Firebase Google Auth to access Studio, Admin, and Tools.</p>
        {errorMessage ? (
          <div className="mt-3 rounded-md border border-red-800 bg-red-950/40 p-3">
            <p className="text-xs uppercase tracking-wide text-red-300">Sign-In Error</p>
            <p className="mt-1 text-sm text-red-200">{errorMessage}</p>
          </div>
        ) : null}
        <button
          type="button"
          className="mt-4 inline-flex items-center rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800 disabled:opacity-60"
          onClick={handleSignIn}
          disabled={isSigningIn}
        >
          {isSigningIn ? 'Signing in...' : 'Sign In With Google'}
        </button>
        <button
          type="button"
          className="mt-3 inline-flex items-center rounded-md border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-900 disabled:opacity-60"
          onClick={handleRedirectOnly}
          disabled={isSigningIn}
        >
          Use Redirect Instead
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
      <Route path="/lab" element={<Navigate to="/studio/lab" replace />} />
      <Route path="/labs" element={<Navigate to="/studio/lab" replace />} />
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
