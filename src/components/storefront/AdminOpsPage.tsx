import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Database, Star } from 'lucide-react';
import { toast } from 'sonner';
import { AdminPanel } from '@/components/AdminPanel';
import { useApp } from '@/context/AppContext';
import type { GitHubConfig } from '@/lib/githubApi';
import {
  patchCatalogSpecGroups,
  fetchCatalogFromGitHub,
  fetchStorefrontConfigFromGitHub,
  writeStorefrontConfigToGitHub,
} from '@/lib/catalogApi';
import { Button } from '@/components/ui/button';
import { isBackendBridgeConfigured } from '@/lib/backendGitHubBridge';

const DEFAULT_OWNER = 'AI-ERP-ITE';
const DEFAULT_REPO = 'Watch-Faces';

function splitRepo(value: string): { owner: string; repo: string } {
  const [owner = '', repo = ''] = value.split('/');
  return {
    owner: owner || DEFAULT_OWNER,
    repo: repo || DEFAULT_REPO,
  };
}

export function AdminOpsPage() {
  const { state } = useApp();
  const backendMode = isBackendBridgeConfigured();
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;
  const initialRepo = useMemo(() => splitRepo(state.githubRepo || `${DEFAULT_OWNER}/${DEFAULT_REPO}`), [state.githubRepo]);

  const [token, setToken] = useState(backendMode ? '' : (state.githubToken || ''));
  const [owner, setOwner] = useState(initialRepo.owner);
  const [repo, setRepo] = useState(initialRepo.repo);
  const [branch, setBranch] = useState('main');
  const [patching, setPatching] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogOptions, setCatalogOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [featuredFaceId, setFeaturedFaceId] = useState<string>('');
  const [savingFeatured, setSavingFeatured] = useState(false);

  const config = useMemo<GitHubConfig>(
    () => ({ token: token.trim(), owner: owner.trim(), repo: repo.trim(), branch: branch.trim() || 'main' }),
    [token, owner, repo, branch]
  );

  const baseUrl = useMemo(() => {
    if (!owner.trim() || !repo.trim()) return '';
    return `https://${owner.trim()}.github.io/${repo.trim()}`;
  }, [owner, repo]);

  const canRun = Boolean((backendMode || config.token) && config.owner && config.repo);

  // Keep admin page credentials synced with Studio settings.
  // Studio is the source of truth for saved GitHub token/repo.
  useEffect(() => {
    if (!backendMode && state.githubToken !== token) {
      setToken(state.githubToken);
    }

    const nextRepo = splitRepo(state.githubRepo || `${DEFAULT_OWNER}/${DEFAULT_REPO}`);
    if (nextRepo.owner !== owner) setOwner(nextRepo.owner);
    if (nextRepo.repo !== repo) setRepo(nextRepo.repo);
  }, [backendMode, owner, repo, state.githubRepo, state.githubToken, token]);

  async function loadCatalogData() {
    if (!canRun) return;

    setLoadingCatalog(true);
    try {
      const [catalog, storefrontConfig] = await Promise.all([
        fetchCatalogFromGitHub(config),
        fetchStorefrontConfigFromGitHub(config),
      ]);

      setCatalogOptions(catalog.map((entry) => ({ id: entry.id, name: entry.name })));
      setFeaturedFaceId(storefrontConfig.featuredFaceId ?? '');
      toast.success('Catalog loaded.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load catalog data');
    } finally {
      setLoadingCatalog(false);
    }
  }

  async function handleSaveFeaturedFace() {
    if (!canRun) {
      toast.error('Set token, owner, and repo first.');
      return;
    }

    setSavingFeatured(true);
    try {
      await writeStorefrontConfigToGitHub(config, {
        featuredFaceId: featuredFaceId || null,
      });
      toast.success('Featured watchface updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save featured watchface');
    } finally {
      setSavingFeatured(false);
    }
  }

  async function handleRunSpecGroupPatch() {
    if (!canRun) {
      toast.error('Set token, owner, and repo first.');
      return;
    }

    setPatching(true);
    try {
      const result = await patchCatalogSpecGroups(config);
      if (result.patched > 0) {
        toast.success(`Patched ${result.patched} entries. Unknown left: ${result.unknownAfter}.`);
      } else {
        toast.info(`No catalog updates needed. Unknown left: ${result.unknownAfter}.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'SpecGroup patch failed');
    } finally {
      setPatching(false);
    }
  }

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div className="rounded-2xl border border-[#2f3642] bg-[#0f1318] px-5 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="Flowvault logo" className="h-10 w-auto" />
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#9ba6b8]">Flowvault</p>
              <p className="text-sm text-[#e9edf5] font-medium">Private Operations Console</p>
            </div>
          </div>
          <Link to="/studio" className="text-sm text-[#d2b37a] hover:text-[#efd5a7] underline underline-offset-4">
            Back to studio
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-[#2f3642] bg-[#11151b] p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#9ba6b8]">Store Admin</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#e9edf5]">Catalog Operations</h1>
            <p className="mt-2 text-sm text-[#9ba6b8] max-w-2xl">
              Run catalog maintenance tools without opening the studio page.
            </p>
          </div>
          <Link to="/" className="text-sm text-[#d2b37a] hover:text-[#efd5a7] underline underline-offset-4">
            Back to store
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {!backendMode && (
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-[#8b95a6]">GitHub Token</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
                className="w-full rounded-lg border border-[#343d4b] bg-[#0d1015] px-3 py-2 text-sm text-[#e8edf6] focus:outline-none focus:border-[#9f8557]"
              />
            </div>
          )}
          {backendMode && (
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-[#8b95a6]">GitHub Token</label>
              <div className="w-full rounded-lg border border-[#343d4b] bg-[#0d1015] px-3 py-2 text-sm text-[#8f9aac]">
                Managed by backend bridge (hidden in browser)
              </div>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wider text-[#8b95a6]">Branch</label>
            <input
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full rounded-lg border border-[#343d4b] bg-[#0d1015] px-3 py-2 text-sm text-[#e8edf6] focus:outline-none focus:border-[#9f8557]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wider text-[#8b95a6]">Owner</label>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full rounded-lg border border-[#343d4b] bg-[#0d1015] px-3 py-2 text-sm text-[#e8edf6] focus:outline-none focus:border-[#9f8557]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wider text-[#8b95a6]">Repo</label>
            <input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="w-full rounded-lg border border-[#343d4b] bg-[#0d1015] px-3 py-2 text-sm text-[#e8edf6] focus:outline-none focus:border-[#9f8557]"
            />
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[#2d3542] bg-[#0d1117] p-4 space-y-3">
          <div className="flex items-center gap-2 text-[#dce3ee] text-sm font-medium">
            <Star className="h-4 w-4 text-[#d2b37a]" />
            Featured Watchface (Hero)
          </div>
          <p className="text-xs text-[#8f9aac]">
            Client users cannot change this. Hero featured face uses this admin selection only.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={loadCatalogData}
              disabled={!canRun || loadingCatalog}
              variant="outline"
              className="h-10 border-[#3b4d68] text-[#ecf2ff] hover:bg-[#263448]"
            >
              {loadingCatalog ? 'Loading Catalog...' : 'Load Catalog'}
            </Button>
          </div>

          <select
            value={featuredFaceId}
            onChange={(e) => setFeaturedFaceId(e.target.value)}
            disabled={!catalogOptions.length || savingFeatured}
            className="w-full rounded-lg border border-[#343d4b] bg-[#0d1015] px-3 py-2 text-sm text-[#e8edf6] focus:outline-none focus:border-[#9f8557]"
          >
            <option value="">No featured override (auto latest)</option>
            {catalogOptions.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} ({entry.id})
              </option>
            ))}
          </select>

          <Button
            onClick={handleSaveFeaturedFace}
            disabled={!canRun || savingFeatured}
            className="h-10 bg-[#1d2736] hover:bg-[#263448] text-[#ecf2ff] border border-[#3b4d68]"
          >
            {savingFeatured ? 'Saving Featured Face...' : 'Save Featured Face'}
          </Button>
        </div>

        <div className="mt-6 rounded-xl border border-[#2d3542] bg-[#0d1117] p-4 space-y-3">
          <div className="flex items-center gap-2 text-[#dce3ee] text-sm font-medium">
            <Database className="h-4 w-4 text-[#d2b37a]" />
            SpecGroup Backfill Patch
          </div>
          <p className="text-xs text-[#8f9aac]">
            Repairs unknown catalog specGroup values using source metadata from docs/zpk/*/source.json.
          </p>
          <Button
            onClick={handleRunSpecGroupPatch}
            disabled={!canRun || patching}
            className="h-10 bg-[#1d2736] hover:bg-[#263448] text-[#ecf2ff] border border-[#3b4d68]"
          >
            <Wrench className={`h-4 w-4 mr-2 ${patching ? 'animate-spin' : ''}`} />
            {patching ? 'Running SpecGroup Patch...' : 'Run SpecGroup Patch'}
          </Button>
        </div>
      </div>

      {canRun && (
        <AdminPanel githubConfig={config} defaultBaseUrl={baseUrl} />
      )}
    </section>
  );
}