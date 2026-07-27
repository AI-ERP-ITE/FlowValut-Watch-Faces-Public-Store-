import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { deleteAbandonedTechnicalPackage, fetchStoreHierarchy, releaseVerifiedPackage, submitReleaseClassification, type HierarchyOption, type HierarchySnapshot } from '@/lib/storeHierarchyApi';
import { findNormalizedConflict, nextRevision, releaseWizardPreview, type ReleaseWizardDraft } from '@/lib/releaseWizard';
import { fetchPublicConfig } from '@/lib/studioFirebasePublishApi';
import { resolveUniqueTargetByResolution, type TechnicalTargetDefinition } from '@/lib/watchModelTarget';

const NEW = '__new__';
const emptyDraft: ReleaseWizardDraft = {
  designDnaName: '', designDnaCode: '', collectionName: '', collectionCode: '', modelName: '', modelNumber: 1,
  variantName: '', variantCode: '', editionName: '', editionCode: '', technicalTargetId: '', revision: 'v1.0',
  description: '', designStory: '', categories: [], tags: [],
  regularPrice: 8, campaignPrice: 4, offerType: 'SKU', bundleSkuIds: [],
};

function optionLabel(option: HierarchyOption) {
  return option.code ? `${option.name} · ${option.code}` : option.name;
}

function TextField({ label, value, disabled, onChange, error }: { label: string; value: string | number; disabled?: boolean; onChange: (value: string) => void; error?: boolean }) {
  return <label className={`text-[10px] ${error ? 'text-red-400' : 'text-[#9ba6b8]'}`}>{label}<input value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={`mt-1 w-full rounded border ${error ? 'border-red-500/50 bg-red-950/20 text-red-100' : 'border-[#34354b] bg-[#0c0d14] text-white'} px-2 py-2 text-xs disabled:opacity-60`} /></label>;
}

function commaSeparatedValues(value: string): string[] {
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
}

export function ReleaseWizard({ projectId, buildId, defaultTarget = '', buildResolution }: { projectId: string; buildId: string; defaultTarget?: string; buildResolution?: { width: number; height: number } }) {
  const [draft, setDraft] = useState<ReleaseWizardDraft>({ ...emptyDraft, technicalTargetId: defaultTarget });
  const [snapshot, setSnapshot] = useState<HierarchySnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [dnaId, setDnaId] = useState(NEW);
  const [collectionId, setCollectionId] = useState(NEW);
  const [modelId, setModelId] = useState(NEW);
  const [skuId, setSkuId] = useState(NEW);
  const [configuredTargets, setConfiguredTargets] = useState<Record<string, TechnicalTargetDefinition>>({});

  const collections = useMemo(() => snapshot?.collections.filter((item) => dnaId !== NEW && item.parentId === dnaId) ?? [], [dnaId, snapshot]);
  const models = useMemo(() => snapshot?.productModels.filter((item) => collectionId !== NEW && item.parentId === collectionId) ?? [], [collectionId, snapshot]);
  const skus = useMemo(() => snapshot?.skus.filter((item) => modelId !== NEW && item.productModelId === modelId) ?? [], [modelId, snapshot]);
  const preview = useMemo(() => { try { return releaseWizardPreview(draft); } catch { return null; } }, [draft]);
  const conflicts = useMemo(() => {
    if (!snapshot) return { dna: null, collection: null, model: null };
    return {
      dna: dnaId === NEW ? findNormalizedConflict(draft.designDnaName, snapshot.designDnas) : null,
      collection: collectionId === NEW ? findNormalizedConflict(draft.collectionName, snapshot.collections) : null,
      model: modelId === NEW ? findNormalizedConflict(draft.modelName, snapshot.productModels) : null,
    };
  }, [dnaId, collectionId, modelId, draft.designDnaName, draft.collectionName, draft.modelName, snapshot]);
  const activeConflictsCount = Object.values(conflicts).filter(Boolean).length;
  const technicalTargets = useMemo(() => {
    const options = new Map<string, string>();
    for (const target of snapshot?.technicalTargets ?? []) options.set(target.id, optionLabel(target));
    for (const id of Object.keys(configuredTargets)) if (!options.has(id)) options.set(id, id);
    if (draft.technicalTargetId && !options.has(draft.technicalTargetId)) {
      options.set(draft.technicalTargetId, draft.technicalTargetId);
    }
    return [...options.entries()].map(([id, label]) => ({ id, label }));
  }, [configuredTargets, draft.technicalTargetId, snapshot]);

  useEffect(() => {
    void fetchStoreHierarchy().then((result) => {
      setSnapshot(result);
      const existingPackage = result.technicalPackages?.find((item) => item.approvedWorkshopProjectId === projectId && item.approvedWorkshopBuildId === buildId);
      if (existingPackage) {
        const sku = result.skus?.find((item) => item.id === existingPackage.skuId);
        const model = result.productModels?.find((item) => item.id === sku?.productModelId);
        const collection = result.collections?.find((item) => item.id === model?.parentId);
        const dna = result.designDnas?.find((item) => item.id === collection?.parentId);
        const offer = result.offers?.find((item) => item.id === existingPackage.offerId);
        if (sku && model && collection && dna) {
          setDnaId(dna.id); setCollectionId(collection.id); setModelId(model.id); setSkuId(sku.id);
          setDraft((current) => ({ ...current, designDnaName: dna.name, designDnaCode: dna.code ?? '', collectionName: collection.name, collectionCode: collection.code ?? '', modelName: model.name, modelNumber: model.modelNumber ?? 1, description: model.description ?? '', designStory: model.designStory ?? '', categories: model.categories ?? [], tags: model.tags ?? [], variantName: sku.variantName, variantCode: sku.variantCode, editionName: sku.editionName ?? '', editionCode: sku.editionCode ?? '', technicalTargetId: existingPackage.technicalTargetId, revision: existingPackage.revision, offerType: offer?.type ?? 'SKU', bundleSkuIds: offer?.type === 'BUNDLE' ? (offer.includedSkuIds ?? []).filter((id) => id !== sku.id) : [], regularPrice: offer?.regularPrice ?? current.regularPrice, campaignPrice: offer?.campaignPrice ?? current.campaignPrice }));
          return;
        }
      }
      const detected = result.technicalTargets?.find((target) => target.id === defaultTarget || target.name === defaultTarget);
      setDraft((current) => ({ ...current, technicalTargetId: detected?.id || defaultTarget }));
    }).catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load store hierarchy'));
  }, [buildId, defaultTarget, projectId]);

  useEffect(() => {
    void fetchPublicConfig<Record<string, TechnicalTargetDefinition>>('specGroups')
      .then((groups) => setConfiguredTargets(groups))
      .catch(() => setConfiguredTargets({}));
  }, []);

  useEffect(() => {
    if (draft.technicalTargetId) return;
    const recovered = resolveUniqueTargetByResolution(buildResolution, configuredTargets);
    if (recovered) patch({ technicalTargetId: recovered });
  }, [buildResolution, configuredTargets, draft.technicalTargetId]);

  useEffect(() => {
    if (!snapshot || !draft.technicalTargetId) return;
    const existingForBuild = snapshot.technicalPackages.find((item) => item.approvedWorkshopProjectId === projectId && item.approvedWorkshopBuildId === buildId);
    if (existingForBuild) {
      setDraft((current) => ({ ...current, revision: existingForBuild.revision }));
      return;
    }
    const revisions = (snapshot.technicalPackages || [])
      .filter((item) => skuId !== NEW && item.skuId === skuId && item.technicalTargetId === draft.technicalTargetId && !['FAILED', 'TRASHED'].includes(item.state))
      .map((item) => item.revision);
    setDraft((current) => ({ ...current, revision: nextRevision(revisions) }));
  }, [buildId, draft.technicalTargetId, projectId, skuId, snapshot]);

  function patch(values: Partial<ReleaseWizardDraft>) { setDraft((current) => ({ ...current, ...values })); }
  function selectDna(id: string) {
    setDnaId(id); setCollectionId(NEW); setModelId(NEW); setSkuId(NEW);
    const item = snapshot?.designDnas.find((candidate) => candidate.id === id);
    patch({ designDnaName: item?.name ?? '', designDnaCode: item?.code ?? '', collectionName: '', collectionCode: '', modelName: '', modelNumber: 1, description: '', designStory: '', categories: [], tags: [], variantName: '', variantCode: '', editionName: '', editionCode: '' });
  }
  function selectCollection(id: string) {
    setCollectionId(id); setModelId(NEW); setSkuId(NEW);
    const item = snapshot?.collections.find((candidate) => candidate.id === id);
    const nextNumber = Math.max(0, ...(snapshot?.productModels.filter((model) => model.parentId === id).map((model) => model.modelNumber ?? 0) ?? [])) + 1;
    patch({ collectionName: item?.name ?? '', collectionCode: item?.code ?? '', modelName: '', modelNumber: nextNumber || 1, description: '', designStory: '', categories: [], tags: [], variantName: '', variantCode: '', editionName: '', editionCode: '' });
  }
  function selectModel(id: string) {
    setModelId(id); setSkuId(NEW);
    const item = snapshot?.productModels.find((candidate) => candidate.id === id);
    patch({ modelName: item?.name ?? '', modelNumber: item?.modelNumber ?? 1, description: item?.description ?? '', designStory: item?.designStory ?? '', categories: item?.categories ?? [], tags: item?.tags ?? [], variantName: '', variantCode: '', editionName: '', editionCode: '' });
  }
  function selectSku(id: string) {
    setSkuId(id);
    const item = snapshot?.skus.find((candidate) => candidate.id === id);
    patch({ variantName: item?.variantName ?? '', variantCode: item?.variantCode ?? '', editionName: item?.editionName ?? '', editionCode: item?.editionCode ?? '' });
  }

  async function submit(action: 'READY' | 'RELEASE') {
    if (!preview || !draft.technicalTargetId) return toast.error('Complete every required identity selection.');
    setBusy(true);
    try {
      const result = await submitReleaseClassification({ ...draft, projectId, buildId, action });
      if (action === 'RELEASE' && result.packageState !== 'CURRENT') {
        await releaseVerifiedPackage(result.packageId);
        toast.success(`${result.canonicalName} released with verified ZPK parity.`);
      } else if (action === 'RELEASE') toast.success(`${result.canonicalName} is already released.`);
      else toast.success(`${result.canonicalName} saved as Ready.`);
      const newSnapshot = await fetchStoreHierarchy();
      setSnapshot(newSnapshot);
      const newDnaId = dnaId === NEW ? newSnapshot.designDnas.find((d) => d.name === draft.designDnaName)?.id ?? NEW : dnaId;
      const newCollectionId = collectionId === NEW ? newSnapshot.collections.find((c) => c.name === draft.collectionName && c.parentId === newDnaId)?.id ?? NEW : collectionId;
      const newModelId = modelId === NEW ? newSnapshot.productModels.find((m) => m.name === draft.modelName && m.parentId === newCollectionId)?.id ?? NEW : modelId;
      const newSkuId = skuId === NEW ? newSnapshot.skus.find((s) => s.variantName === draft.variantName && s.productModelId === newModelId && (s.editionName || '') === (draft.editionName || ''))?.id ?? NEW : skuId;
      setDnaId(newDnaId);
      setCollectionId(newCollectionId);
      setModelId(newModelId);
      setSkuId(newSkuId);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Release operation failed'); }
    finally { setBusy(false); }
  }

  async function discardAbandonedPackage(packageId: string) {
    if (!window.confirm(`Remove abandoned release classification ${packageId}?\n\nThe approved Workshop FVWF and Test ZPK remain untouched.`)) return;
    setBusy(true);
    try {
      await deleteAbandonedTechnicalPackage(packageId);
      setSnapshot(await fetchStoreHierarchy());
      toast.success('Abandoned release classification removed. Workshop artifacts were preserved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove abandoned release classification');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-violet-900/70 bg-[#10101a] p-4 space-y-4">
      <div><h3 className="text-sm font-semibold text-violet-200">Guided Store Release</h3><p className="text-xs text-[#9097aa]">Choose an existing identity or explicitly create a new one. Permanent artistic classification is never guessed.</p></div>
      {!snapshot && <p className="text-xs text-[#9097aa]">Loading controlled hierarchy…</p>}
      {snapshot && <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[10px] text-[#9ba6b8]">1. Design DNA<select value={dnaId} onChange={(event) => selectDna(event.target.value)} className="mt-1 w-full rounded border border-[#34354b] bg-[#0c0d14] px-2 py-2 text-xs text-white"><option value={NEW}>Create new…</option>{(snapshot.designDnas || []).map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}</select></label>
          <label className="text-[10px] text-[#9ba6b8]">2. Collection<select value={collectionId} onChange={(event) => selectCollection(event.target.value)} disabled={!draft.designDnaName} className="mt-1 w-full rounded border border-[#34354b] bg-[#0c0d14] px-2 py-2 text-xs text-white disabled:opacity-50"><option value={NEW}>Create new…</option>{collections.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}</select></label>
          <label className="text-[10px] text-[#9ba6b8]">3. Design Model<select value={modelId} onChange={(event) => selectModel(event.target.value)} disabled={!draft.collectionName} className="mt-1 w-full rounded border border-[#34354b] bg-[#0c0d14] px-2 py-2 text-xs text-white disabled:opacity-50"><option value={NEW}>Create new…</option>{models.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}</select></label>
          <label className="text-[10px] text-[#9ba6b8]">4. Variant / Edition<select value={skuId} onChange={(event) => selectSku(event.target.value)} disabled={!draft.modelName} className="mt-1 w-full rounded border border-[#34354b] bg-[#0c0d14] px-2 py-2 text-xs text-white disabled:opacity-50"><option value={NEW}>Create new SKU…</option>{skus.map((item) => <option key={item.id} value={item.id}>{item.variantName}{item.editionName ? ` · ${item.editionName}` : ''}</option>)}</select></label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <TextField label="Design DNA name" value={draft.designDnaName} disabled={dnaId !== NEW} onChange={(value) => patch({ designDnaName: value })} error={!!conflicts.dna} />
          <TextField label="DNA code" value={draft.designDnaCode} disabled={dnaId !== NEW} onChange={(value) => patch({ designDnaCode: value })} />
          <TextField label="Collection name" value={draft.collectionName} disabled={collectionId !== NEW} onChange={(value) => patch({ collectionName: value })} error={!!conflicts.collection} />
          <TextField label="Collection code" value={draft.collectionCode} disabled={collectionId !== NEW} onChange={(value) => patch({ collectionCode: value })} />
          <TextField label="Design Model" value={draft.modelName} disabled={modelId !== NEW} onChange={(value) => patch({ modelName: value })} error={!!conflicts.model} />
          <TextField label="Model number" value={draft.modelNumber} disabled={modelId !== NEW} onChange={(value) => patch({ modelNumber: Number(value) })} />
          <TextField label="Color / Material Variant" value={draft.variantName} disabled={skuId !== NEW} onChange={(value) => patch({ variantName: value })} />
          <TextField label="Variant code" value={draft.variantCode} disabled={skuId !== NEW} onChange={(value) => patch({ variantCode: value })} />
          <TextField label="Widget Edition (optional)" value={draft.editionName ?? ''} disabled={skuId !== NEW} onChange={(value) => patch({ editionName: value })} />
          <TextField label="Edition code (optional)" value={draft.editionCode ?? ''} disabled={skuId !== NEW} onChange={(value) => patch({ editionCode: value })} />
          <label className={`text-[10px] ${draft.technicalTargetId ? 'text-[#9ba6b8]' : 'text-amber-300'}`}>
            Detected Technical Variant
            <select
              value={draft.technicalTargetId}
              onChange={(event) => patch({ technicalTargetId: event.target.value })}
              className={`mt-1 w-full rounded border px-2 py-2 text-xs text-white ${
                draft.technicalTargetId
                  ? 'border-[#34354b] bg-[#0c0d14]'
                  : 'border-amber-600/60 bg-amber-950/20'
              }`}
            >
              <option value="">Not detected — select verified target…</option>
              {technicalTargets.map((target) => <option key={target.id} value={target.id}>{target.label}</option>)}
            </select>
          </label>
          <TextField label="Next revision" value={draft.revision} onChange={(value) => patch({ revision: value })} />
          <TextField label="Regular price USD" value={draft.regularPrice} onChange={(value) => patch({ regularPrice: Number(value) })} />
          <TextField label="Campaign price USD" value={draft.campaignPrice ?? ''} onChange={(value) => patch({ campaignPrice: value ? Number(value) : undefined })} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-[10px] text-[#9ba6b8]">Store description<textarea value={draft.description ?? ''} onChange={(event) => patch({ description: event.target.value })} maxLength={5000} rows={4} className="mt-1 w-full rounded border border-[#34354b] bg-[#0c0d14] px-2 py-2 text-xs text-white" /></label>
          <label className="text-[10px] text-[#9ba6b8]">Design story (optional)<textarea value={draft.designStory ?? ''} onChange={(event) => patch({ designStory: event.target.value })} maxLength={10000} rows={4} className="mt-1 w-full rounded border border-[#34354b] bg-[#0c0d14] px-2 py-2 text-xs text-white" /></label>
          <TextField label="Categories (comma separated)" value={(draft.categories ?? []).join(', ')} onChange={(value) => patch({ categories: commaSeparatedValues(value) })} />
          <TextField label="Search tags (comma separated)" value={(draft.tags ?? []).join(', ')} onChange={(value) => patch({ tags: commaSeparatedValues(value) })} />
        </div>
        <label className="block text-[10px] text-[#9ba6b8]">Offer<select value={draft.offerType ?? 'SKU'} onChange={(event) => patch({ offerType: event.target.value as 'SKU' | 'BUNDLE' })} className="mt-1 w-full max-w-sm rounded border border-[#34354b] bg-[#0c0d14] px-2 py-2 text-xs text-white"><option value="SKU">Individual watchface</option><option value="BUNDLE">Complete Color Collection</option></select></label>
        {draft.offerType === 'BUNDLE' && <div className="rounded border border-[#30324a] p-3 text-xs text-[#9ba6b8]"><p className="mb-2">Include existing SKUs in this Complete Color Collection:</p><div className="grid gap-2 sm:grid-cols-2">{(snapshot.skus || []).filter((item) => item.productModelId === modelId && item.id !== skuId).map((item) => <label key={item.id} className="flex gap-2"><input type="checkbox" checked={draft.bundleSkuIds?.includes(item.id) ?? false} onChange={(event) => patch({ bundleSkuIds: event.target.checked ? [...(draft.bundleSkuIds ?? []), item.id] : (draft.bundleSkuIds ?? []).filter((id) => id !== item.id) })} />{item.name}</label>)}</div></div>}
      </>}
      {preview && <div className={`rounded border ${activeConflictsCount ? 'border-red-900/50 bg-red-950/20' : 'border-[#30324a]'} p-2 text-xs`}><p className="text-white">{preview.canonicalName}</p><p className="font-mono text-violet-300">{preview.internalCode}</p><p className={activeConflictsCount ? 'text-red-300 font-medium' : 'text-emerald-300'}>{activeConflictsCount ? `${activeConflictsCount} conflict(s): A name you entered is already in use elsewhere. Please enter a globally unique name or select the existing one from the dropdown.` : 'No unresolved normalized conflicts.'}</p></div>}
      {!draft.technicalTargetId && <p className="text-xs text-amber-300">The build has no saved technical target. Select the verified target in the existing field before continuing.</p>}
      {(snapshot?.technicalPackages ?? [])
        .filter((item) => item.approvedWorkshopProjectId === projectId && item.approvedWorkshopBuildId === buildId && ['READY', 'VALIDATING', 'FAILED', 'TRASHED'].includes(item.state))
        .map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-amber-900/60 bg-amber-950/20 p-2 text-xs">
            <span className="text-amber-200">{item.technicalTargetId} · {item.revision} · {item.state}</span>
            <Button disabled={busy} onClick={() => discardAbandonedPackage(item.id)} variant="outline" className="h-8 border-red-900 text-red-300">Discard abandoned classification</Button>
          </div>
        ))}
      <div className="flex gap-2"><Button disabled={busy || !preview || !draft.technicalTargetId || activeConflictsCount > 0} onClick={() => submit('READY')} variant="outline">Save as Ready</Button><Button disabled={busy || !preview || !draft.technicalTargetId || activeConflictsCount > 0} onClick={() => submit('RELEASE')} className="bg-violet-700 hover:bg-violet-600">Release to Store</Button></div>
      <p className="text-[10px] text-[#747c90]">Release reuses the approved physical-test ZPK and rewrites only allowlisted name metadata. Failed or interrupted releases can be resumed safely.</p>
    </div>
  );
}
