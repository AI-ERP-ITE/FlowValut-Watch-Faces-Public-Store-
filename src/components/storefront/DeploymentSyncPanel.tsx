import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  connectStagingCommerceAdmin,
  stagingAdminEndpointFetch,
  subscribeStagingCommerceAuth,
} from '@/lib/stagingCommerceAdminClient';
import { adminFetch } from '@/lib/studioFirebasePublishApi';

type PromotionState = 'DISCOVERED' | 'TEST_ACCEPTED' | 'REVIEW_RUNNING' | 'REVIEW_PASSED' | 'PREVIEW_BUILDING' | 'PREVIEW_READY' | 'PREVIEW_ACCEPTED' | 'SYNC_RUNNING' | 'PRODUCTION_SYNCED' | 'FAILED';
type PromotionAction = 'TEST_ACCEPTED' | 'RUN_REVIEW' | 'CREATE_PREVIEW' | 'PREVIEW_ACCEPTED' | 'SYNC_TO_LIVE';

interface PolicyRow {
  id: string;
  treatment: 'COPY_IDENTICAL' | 'MAP_FIXED' | 'ADJUST_ENVIRONMENT' | 'ADMIN_PROTECTED' | 'SECRET_REFERENCE' | 'NEVER_COPY';
  staging: string;
  production: string;
  adminEditable: boolean;
  reason: string;
  passed: true;
}

interface SyncRow {
  id: string;
  syncId: string;
  state: PromotionState;
  appCommit: string;
  backendCommit: string;
  artifactHash: string;
  fileCount: number;
  createdAt: string | null;
  gates?: Record<string, { passed: boolean; detail: string }>;
  previewUrl?: string;
  runnerStatus?: string;
}

interface SyncResponse {
  policyVersion: number;
  policyHash: string;
  policy: PolicyRow[];
  environmentMap: Record<string, string>;
  protectedConfig: Record<string, unknown>;
  syncs: SyncRow[];
  discoveryError: string | null;
}

const stepDefinitions: Array<{ action: PromotionAction; label: string; allowed: PromotionState[] }> = [
  { action: 'TEST_ACCEPTED', label: '1. Test Accepted', allowed: ['DISCOVERED'] },
  { action: 'RUN_REVIEW', label: '2. Run Review Checks', allowed: ['TEST_ACCEPTED', 'REVIEW_RUNNING'] },
  { action: 'CREATE_PREVIEW', label: '3. Create Live Preview', allowed: ['REVIEW_PASSED'] },
  { action: 'PREVIEW_ACCEPTED', label: '4. Preview Accepted', allowed: ['PREVIEW_READY'] },
  { action: 'SYNC_TO_LIVE', label: '5. Sync to Live', allowed: ['PREVIEW_ACCEPTED'] },
];

const treatmentLabels: Record<PolicyRow['treatment'], string> = {
  COPY_IDENTICAL: 'Copy exactly',
  MAP_FIXED: 'Fixed map',
  ADJUST_ENVIRONMENT: 'Automatic adjustment',
  ADMIN_PROTECTED: 'Admin-protected value',
  SECRET_REFERENCE: 'Secret reference only',
  NEVER_COPY: 'Never copy',
};

export function DeploymentSyncPanel() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<PromotionAction | null>(null);
  const [data, setData] = useState<SyncResponse | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [liveClientToken, setLiveClientToken] = useState('');
  const [liveCatalogMappings, setLiveCatalogMappings] = useState('{}');
  const [syncingLiveCatalog, setSyncingLiveCatalog] = useState(false);

  useEffect(() => subscribeStagingCommerceAuth((user) => setConnected(Boolean(user))), []);

  const selected = useMemo(() => data?.syncs.find((row) => row.syncId === selectedId) ?? data?.syncs[0] ?? null, [data, selectedId]);

  async function load() {
    setLoading(true);
    try {
      const response = await stagingAdminEndpointFetch<SyncResponse>('adminDeploymentSync', { method: 'GET' });
      setData(response);
      setLiveCatalogMappings(JSON.stringify(response.protectedConfig.paddleLiveCatalogMappings ?? {}, null, 2));
      setSelectedId((current) => response.syncs.some((row) => row.syncId === current) ? current : response.syncs[0]?.syncId ?? '');
      if (response.discoveryError) toast.warning(`Staging release discovery: ${response.discoveryError}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load deployment syncs.');
    } finally { setLoading(false); }
  }

  useEffect(() => { if (connected) void load(); }, [connected]);

  async function run(action: PromotionAction) {
    if (!selected) return;
    if (action === 'SYNC_TO_LIVE' && !window.confirm(`Sync ${selected.syncId} to production Hosting? This does not change DNS and does not run a real Paddle payment.`)) return;
    setBusyAction(action);
    try {
      await stagingAdminEndpointFetch('adminDeploymentSync', { method: 'POST', body: JSON.stringify({ action, syncId: selected.syncId }) });
      toast.success(`${action.replaceAll('_', ' ')} recorded for ${selected.syncId}.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Promotion action failed.');
    } finally { setBusyAction(null); }
  }

  async function saveProtectedConfig() {
    let mappings: unknown;
    try {
      mappings = JSON.parse(liveCatalogMappings);
      if (!mappings || typeof mappings !== 'object' || Array.isArray(mappings)) throw new Error();
    } catch {
      toast.error('Live catalog mappings must be a JSON object.');
      return;
    }
    const values: Record<string, unknown> = {
      paddleLiveCatalogMappings: mappings,
      liveCheckoutEnabled: false,
    };
    if (liveClientToken.trim()) {
      if (!/^live_[A-Za-z0-9_-]{20,}$/.test(liveClientToken.trim())) {
        toast.error('Enter a valid Paddle Live client-side token.');
        return;
      }
      values.paddleLiveClientToken = liveClientToken.trim();
    }
    setSavingConfig(true);
    try {
      await stagingAdminEndpointFetch('adminDeploymentSync', {
        method: 'POST',
        body: JSON.stringify({ action: 'UPDATE_PROTECTED_CONFIG', values }),
      });
      setLiveClientToken('');
      toast.success('Protected production configuration saved. Live checkout remains disabled.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save protected production configuration.');
    } finally { setSavingConfig(false); }
  }

  async function syncLiveCatalog() {
    if (!window.confirm('Create or reconcile the 24 FlowVault products and prices in Paddle Live? This creates catalog objects only; it cannot charge a customer.')) return;
    setSyncingLiveCatalog(true);
    try {
      let cursor: string | undefined;
      const mappings: Record<string, { productId: string; priceId: string }> = {};
      let processedOffers = 0;
      do {
        const response = await adminFetch<{
          results: Array<{ offerId: string; status?: string; productId?: string | null; activePriceId?: string; code?: string }>;
          nextCursor: string | null;
        }>('adminPaddleLiveCatalog', {
          method: 'POST',
          body: JSON.stringify({ action: 'BULK_SYNC', environment: 'production', cursor, limit: 10 }),
        });
        const failed = response.results.find((row) => row.code || row.status === 'ERROR');
        if (failed) throw new Error(`${failed.offerId}: ${failed.code || 'Live catalog synchronization failed'}`);
        processedOffers += response.results.length;
        for (const row of response.results) {
          if (row.productId && row.activePriceId) mappings[row.offerId] = { productId: row.productId, priceId: row.activePriceId };
        }
        cursor = response.nextCursor || undefined;
      } while (cursor);
      if (!processedOffers || Object.keys(mappings).length !== processedOffers) {
        throw new Error(`Live catalog mapping incomplete: ${Object.keys(mappings).length}/${processedOffers} offers.`);
      }
      await stagingAdminEndpointFetch('adminDeploymentSync', {
        method: 'POST',
        body: JSON.stringify({ action: 'UPDATE_PROTECTED_CONFIG', values: { paddleLiveCatalogMappings: mappings, liveCheckoutEnabled: false } }),
      });
      toast.success(`Paddle Live catalog synchronized: ${processedOffers}/${processedOffers} offers. Checkout remains disabled.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Paddle Live catalog synchronization failed.');
    } finally { setSyncingLiveCatalog(false); }
  }

  const gateRows = selected ? Object.entries(selected.gates ?? {}) : [];

  return (
    <section className="rounded-2xl border border-violet-800/70 bg-[#10131a] p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-violet-200"><ShieldCheck className="h-5 w-5" /><h2 className="text-lg font-semibold">Staging → Production Sync</h2></div>
          <p className="mt-1 max-w-3xl text-xs text-[#99a4b5]">Promotes the accepted staging build through five confirmations. DNS and real Paddle payments remain separate stopped gates.</p>
        </div>
        {!connected ? <Button onClick={() => void connectStagingCommerceAdmin()} className="bg-violet-700 text-white">Connect Staging Admin</Button>
          : <Button onClick={() => void load()} disabled={loading} variant="outline"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh Sync IDs</Button>}
      </div>

      {data && <div className="grid gap-3 md:grid-cols-3 text-xs">
        <div className="rounded-lg border border-[#303846] p-3"><span className="text-[#7f8a9c]">Staging project</span><p className="mt-1 font-mono text-[#dce4ef]">{data.environmentMap.stagingProjectId}</p></div>
        <div className="rounded-lg border border-[#303846] p-3"><span className="text-[#7f8a9c]">Production project</span><p className="mt-1 font-mono text-[#dce4ef]">{data.environmentMap.productionProjectId}</p></div>
        <div className="rounded-lg border border-[#303846] p-3"><span className="text-[#7f8a9c]">Policy</span><p className="mt-1 font-mono text-[#dce4ef]">v{data.policyVersion} · {data.policyHash.slice(0, 12)}</p></div>
      </div>}

      {data?.syncs.length ? <>
        <select value={selected?.syncId ?? ''} onChange={(event) => setSelectedId(event.target.value)} className="w-full rounded-lg border border-[#343d4b] bg-[#0d1015] px-3 py-2 text-sm text-[#e8edf6]">
          {data.syncs.map((row) => <option key={row.syncId} value={row.syncId}>{row.syncId} · {row.state}</option>)}
        </select>
        {selected && <div className="rounded-lg border border-[#303846] bg-[#0b0f14] p-3 text-xs">
          <div className="flex flex-wrap justify-between gap-2"><span className="font-mono text-violet-200">{selected.syncId}</span><span className="rounded bg-violet-950 px-2 py-1 text-violet-200">{selected.state}</span></div>
          <p className="mt-2 text-[#8290a3]">App {selected.appCommit.slice(0, 8)} · Backend {selected.backendCommit.slice(0, 8)} · {selected.fileCount} files · Artifact {selected.artifactHash.slice(0, 12)}</p>
          {selected.runnerStatus && <p className="mt-2 text-amber-300">Runner: {selected.runnerStatus}</p>}
        </div>}
        <div className="grid gap-2 md:grid-cols-5">
          {stepDefinitions.map((step) => <Button key={step.action} onClick={() => void run(step.action)} disabled={!selected || busyAction !== null || !step.allowed.includes(selected.state)} variant="outline" className="min-h-11 whitespace-normal border-violet-900 text-violet-100">{busyAction === step.action ? 'Working…' : step.label}</Button>)}
        </div>
      </> : connected && !loading ? <div className="rounded-lg border border-amber-900 bg-amber-950/20 p-3 text-xs text-amber-200"><CircleAlert className="mr-2 inline h-4 w-4" />No deployable staging manifest was found. The next staging Hosting deployment creates it automatically.</div> : null}

      {gateRows.length > 0 && <details open className="rounded-lg border border-[#303846] p-3"><summary className="cursor-pointer text-sm font-medium text-[#dce4ef]">Review checklist · {gateRows.filter(([, gate]) => gate.passed).length}/{gateRows.length} passed</summary><div className="mt-3 grid gap-2 md:grid-cols-2">{gateRows.map(([id, gate]) => <div key={id} className={`rounded border p-2 text-xs ${gate.passed ? 'border-emerald-900 bg-emerald-950/20' : 'border-amber-900 bg-amber-950/20'}`}><p className={gate.passed ? 'text-emerald-300' : 'text-amber-300'}>{gate.passed ? <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" /> : <CircleAlert className="mr-1 inline h-3.5 w-3.5" />}{id}</p><p className="mt-1 text-[#8f9aac]">{gate.detail}</p></div>)}</div></details>}

      {data && <details className="rounded-lg border border-[#303846] p-3"><summary className="cursor-pointer text-sm font-medium text-[#dce4ef]">Copy, mapping, adjustment, Admin and exclusion checklist · {data.policy.length}/{data.policy.length}</summary><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[820px] text-left text-xs"><thead className="text-[#8894a6]"><tr><th className="p-2">Part</th><th className="p-2">Treatment</th><th className="p-2">Staging</th><th className="p-2">Production</th><th className="p-2">Future change</th><th className="p-2">Validated</th></tr></thead><tbody>{data.policy.map((row) => <tr key={row.id} className="border-t border-[#252d38]"><td className="p-2 text-[#dce4ef]">{row.id}</td><td className="p-2 text-violet-200">{treatmentLabels[row.treatment]}</td><td className="p-2 text-[#929daf]">{row.staging}</td><td className="p-2 text-[#929daf]">{row.production}</td><td className="p-2 text-[#929daf]">{row.adminEditable ? 'Admin protected editor' : 'Policy/code change required'}</td><td className="p-2 text-emerald-300">✓</td></tr>)}</tbody></table></div></details>}

      {data && <details className="rounded-lg border border-[#303846] p-3">
        <summary className="cursor-pointer text-sm font-medium text-[#dce4ef]">Protected production configuration</summary>
        <div className="mt-3 grid gap-4">
          <div>
            <label htmlFor="paddle-live-client-token" className="text-xs text-[#a9b3c2]">Paddle Live client-side token · {data.protectedConfig.paddleLiveClientToken ? 'configured' : 'missing'}</label>
            <input id="paddle-live-client-token" type="password" autoComplete="off" value={liveClientToken} onChange={(event) => setLiveClientToken(event.target.value)} placeholder="Leave blank to keep the configured token" className="mt-1 w-full rounded-lg border border-[#343d4b] bg-[#0d1015] px-3 py-2 font-mono text-xs text-[#e8edf6]" />
          </div>
          <div>
            <label htmlFor="paddle-live-catalog-mappings" className="text-xs text-[#a9b3c2]">Paddle Live catalog mappings (Offer ID → Live Paddle IDs)</label>
            <textarea id="paddle-live-catalog-mappings" value={liveCatalogMappings} onChange={(event) => setLiveCatalogMappings(event.target.value)} rows={8} spellCheck={false} className="mt-1 w-full rounded-lg border border-[#343d4b] bg-[#0d1015] px-3 py-2 font-mono text-xs text-[#e8edf6]" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-900 bg-amber-950/20 p-3 text-xs text-amber-200">
            <span>Live checkout is locked OFF until the separately confirmed real-payment gate.</span>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void syncLiveCatalog()} disabled={syncingLiveCatalog || savingConfig} variant="outline">{syncingLiveCatalog ? 'Syncing Live catalog…' : 'Initialize/reconcile Live catalog'}</Button>
              <Button onClick={() => void saveProtectedConfig()} disabled={savingConfig || syncingLiveCatalog} className="bg-violet-700 text-white">{savingConfig ? 'Saving…' : 'Save protected config'}</Button>
            </div>
          </div>
        </div>
      </details>}
    </section>
  );
}
