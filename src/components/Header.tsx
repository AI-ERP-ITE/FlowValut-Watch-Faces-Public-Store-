import { useEffect, useState } from 'react';
import { Settings, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp, actions } from '@/context/AppContext';
import { testGitHubConnection } from '@/lib/githubApi';
import { toast } from 'sonner';
import {
  getCurrentAuthUser,
  isFirebaseAuthConfigured,
  signInAdminWithGoogle,
  signOutAdmin,
  subscribeAuthState,
} from '@/lib/firebaseAuthClient';
import { isBackendBridgeConfigured } from '@/lib/backendGitHubBridge';

export function Header() {
  const { state, dispatch } = useApp();
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [authUserEmail, setAuthUserEmail] = useState<string | null>(getCurrentAuthUser()?.email ?? null);
  const backendMode = isBackendBridgeConfigured();
  const canUseFirebaseAuth = isFirebaseAuthConfigured();

  useEffect(() => {
    if (!canUseFirebaseAuth) return;
    return subscribeAuthState((user) => {
      setAuthUserEmail(user?.email ?? null);
    });
  }, [canUseFirebaseAuth]);

  const handleTestConnection = async () => {
    if (!backendMode) {
      toast.error('Backend bridge URL is not configured for this private build.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const [owner, repo] = state.githubRepo.split('/');
    const success = await testGitHubConnection({
      token: state.githubToken,
      owner,
      repo,
    });

    setTestResult(success);
    setIsTesting(false);

    if (success) {
      toast.success('GitHub connection successful!');
    } else {
      toast.error('GitHub connection failed. Check your token and repo name.');
    }
  };

  const handleSignIn = async () => {
    try {
      await signInAdminWithGoogle();
      toast.success('Signed in for backend bridge access.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Sign-in failed');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutAdmin();
      toast.success('Signed out');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Sign-out failed');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-[#0F0F0F]/80 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src={logoSrc} alt="Logo" className="h-9 w-auto" />
          <div className="flex flex-col">
            <span className="text-base font-semibold text-white leading-tight">
              Watch Face Creator
            </span>
            <span className="text-xs text-zinc-500 hidden sm:block">
              AI-Powered ZeppOS Designer
            </span>
          </div>
        </div>

        {/* Settings */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1A1A1A] border-zinc-800 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Backend Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {backendMode ? (
                <div className="space-y-2 rounded-lg border border-zinc-800 p-3 bg-zinc-900/60">
                  <Label className="text-sm text-zinc-300">GitHub Token</Label>
                  <p className="text-xs text-zinc-500">Backend bridge mode active. Browser token storage is disabled.</p>
                </div>
              ) : (
                <div className="space-y-2 rounded-lg border border-red-900/50 p-3 bg-red-950/30">
                  <Label className="text-sm text-red-200">Backend Bridge Required</Label>
                  <p className="text-xs text-red-200/80">
                    Private mode blocks browser GitHub tokens. Configure VITE_GITHUB_FUNCTIONS_BASE_URL for this build.
                  </p>
                </div>
              )}

              {backendMode && canUseFirebaseAuth && (
                <div className="space-y-2 rounded-lg border border-zinc-800 p-3 bg-zinc-900/60">
                  <Label className="text-sm text-zinc-300">Backend Auth</Label>
                  <p className="text-xs text-zinc-500">
                    {authUserEmail ? `Signed in as ${authUserEmail}` : 'Sign in with Firebase to access backend bridge endpoints.'}
                  </p>
                  <Button
                    onClick={authUserEmail ? handleSignOut : handleSignIn}
                    variant="outline"
                    className="w-full border-zinc-700 text-white hover:bg-zinc-800"
                  >
                    {authUserEmail ? 'Sign Out' : 'Sign In With Google'}
                  </Button>
                </div>
              )}

              {/* Repo */}
              <div className="space-y-2">
                <Label htmlFor="repo" className="text-sm text-zinc-300">
                  Repository
                </Label>
                <Input
                  id="repo"
                  value={state.githubRepo}
                  onChange={(e) => {
                    dispatch(actions.setGithubRepo(e.target.value));
                    setTestResult(null);
                  }}
                  placeholder="username/repo-name"
                  className="bg-[#0F0F0F] border-zinc-700 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:ring-cyan-500/20"
                />
                <p className="text-xs text-zinc-500">
                  Format: owner/repo-name (e.g., AI-ERP-ITE/Watch-Faces)
                </p>
              </div>

              {/* Test Connection Button */}
              <Button
                onClick={handleTestConnection}
                disabled={isTesting || !backendMode}
                variant="outline"
                className="w-full border-zinc-700 text-white hover:bg-zinc-800"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : testResult === true ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Connected!
                  </>
                ) : testResult === false ? (
                  <>
                    <XCircle className="h-4 w-4 mr-2 text-red-500" />
                    Connection Failed
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>

              {/* Instructions */}
              <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-400">
                  <strong className="text-zinc-300">Your ZPK files will be uploaded to:</strong>
                  <br />
                  https://{state.githubRepo.split('/')[0]}.github.io/
                  {state.githubRepo.split('/')[1]}/
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
