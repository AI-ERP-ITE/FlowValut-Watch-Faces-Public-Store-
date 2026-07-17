import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { fetchStoreHierarchy, submitReleaseClassification, type HierarchySnapshot } from '@/lib/storeHierarchyApi';
import { findNormalizedConflict, releaseWizardPreview, type ReleaseWizardDraft } from '@/lib/releaseWizard';

const emptyDraft: ReleaseWizardDraft = {
  designDnaName: '', designDnaCode: '', collectionName: '', collectionCode: '', modelName: '', modelNumber: 1,
  variantName: '', variantCode: '', editionName: '', editionCode: '', technicalTargetId: '', revision: 'v1.0', regularPrice: 8, campaignPrice: 4,
};

export function ReleaseWizard({ projectId, buildId, defaultTarget = '' }: { projectId: string; buildId: string; defaultTarget?: string }) {
  const [draft, setDraft] = useState<ReleaseWizardDraft>({ ...emptyDraft, technicalTargetId: defaultTarget });
  const [snapshot, setSnapshot] = useState<HierarchySnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => {
    try { return releaseWizardPreview(draft); } catch { return null; }
  }, [draft]);
  const conflicts = snapshot ? [
    findNormalizedConflict(draft.designDnaName, snapshot.designDnas),
    findNormalizedConflict(draft.collectionName, snapshot.collections),
    findNormalizedConflict(draft.modelName, snapshot.productModels),
  ].filter(Boolean) : [];

  useEffect(() => { void fetchStoreHierarchy().then(setSnapshot).catch(() => undefined); }, []);
  function field<K extends keyof ReleaseWizardDraft>(key: K, value: ReleaseWizardDraft[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  async function submit(action: 'READY' | 'RELEASE') {
    if (!preview) return toast.error('Complete all canonical identity fields.');
    setBusy(true);
    try {
      const result = await submitReleaseClassification({ ...draft, projectId, buildId, action });
      toast.success(action === 'READY' ? `${result.canonicalName} saved as Ready.` : `${result.canonicalName} queued for verified release.`);
      setSnapshot(await fetchStoreHierarchy());
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Release classification failed'); }
    finally { setBusy(false); }
  }
  const textFields: Array<[keyof ReleaseWizardDraft, string]> = [
    ['designDnaName', 'Design DNA'], ['designDnaCode', 'DNA code'], ['collectionName', 'Collection'], ['collectionCode', 'Collection code'],
    ['modelName', 'Design Model'], ['variantName', 'Color / Material Variant'], ['variantCode', 'Variant code'], ['editionName', 'Widget Edition (optional)'],
    ['editionCode', 'Edition code (optional)'], ['technicalTargetId', 'Detected Technical Target'], ['revision', 'Revision'],
  ];
  return (
    <div className="rounded-xl border border-violet-900/70 bg-[#10101a] p-4 space-y-3">
      <div><h3 className="text-sm font-semibold text-violet-200">Guided Store Release</h3><p className="text-xs text-[#9097aa]">Classification becomes permanent product identity. Existing normalized matches are reused automatically.</p></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {textFields.map(([key, label]) => <label key={key} className="text-[10px] text-[#9ba6b8]">{label}<input value={String(draft[key] ?? '')} onChange={(event) => field(key, event.target.value as never)} className="mt-1 w-full rounded border border-[#34354b] bg-[#0c0d14] px-2 py-2 text-xs text-white" /></label>)}
        <label className="text-[10px] text-[#9ba6b8]">Model number<input type="number" min={1} value={draft.modelNumber} onChange={(event) => field('modelNumber', Number(event.target.value))} className="mt-1 w-full rounded border border-[#34354b] bg-[#0c0d14] px-2 py-2 text-xs text-white" /></label>
        <label className="text-[10px] text-[#9ba6b8]">Regular price USD<input type="number" min={0} step="0.01" value={draft.regularPrice} onChange={(event) => field('regularPrice', Number(event.target.value))} className="mt-1 w-full rounded border border-[#34354b] bg-[#0c0d14] px-2 py-2 text-xs text-white" /></label>
        <label className="text-[10px] text-[#9ba6b8]">Campaign price USD<input type="number" min={0} step="0.01" value={draft.campaignPrice ?? ''} onChange={(event) => field('campaignPrice', event.target.value ? Number(event.target.value) : undefined)} className="mt-1 w-full rounded border border-[#34354b] bg-[#0c0d14] px-2 py-2 text-xs text-white" /></label>
      </div>
      {preview && <div className="rounded border border-[#30324a] p-2 text-xs"><p className="text-white">{preview.canonicalName}</p><p className="font-mono text-violet-300">{preview.internalCode}</p><p className="text-amber-300">{conflicts.length} normalized existing match(es) will be reused.</p></div>}
      <div className="flex gap-2"><Button disabled={busy || !preview} onClick={() => submit('READY')} variant="outline">Save as Ready</Button><Button disabled={busy || !preview} onClick={() => submit('RELEASE')} className="bg-violet-700 hover:bg-violet-600">Release to Store</Button></div>
      <p className="text-[10px] text-[#747c90]">Release remains VALIDATING until the Phase 5 repacker proves exact ZPK parity and canonical embedded naming.</p>
    </div>
  );
}
