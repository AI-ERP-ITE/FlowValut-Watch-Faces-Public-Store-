import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Database } from 'lucide-react';
import { toast } from 'sonner';
import { AdminPanel } from '@/components/AdminPanel';
import type { GitHubConfig } from '@/lib/githubApi';
import { patchCatalogSpecGroups } from '@/lib/catalogApi';
import { Button } from '@/components/ui/button';

const DEFAULT_OWNER = 'AI-ERP-ITE';
const DEFAULT_REPO = 'Watch-Faces';

export function AdminOpsPage() {
  const [token, setToken] = useState('');
  const [owner, setOwner] = useState(DEFAULT_OWNER);
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [branch, setBranch] = useState('main');
  const [patching, setPatching] = useState(false);

  const config = useMemo<GitHubConfig>(
    () => ({ token: token.trim(), owner: owner.trim(), repo: repo.trim(), branch: branch.trim() || 'main' }),
    [token, owner, repo, branch]
  );

  const baseUrl = useMemo(() => {
    if (!owner.trim() || !repo.trim()) return '';
    return `https://${owner.trim()}.github.io/${repo.trim()}`;
  }, [owner, repo]);

  const canRun = Boolean(config.token && config.owner && config.repo);

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