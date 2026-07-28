import { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import models from '../../models.json';
import { InteractiveCanvas } from '@/components/InteractiveCanvas';
import { ElementList } from '@/components/ElementList';
import { parseProjectFileArtifact } from '@/lib/projectFileArtifact';
import { resolveWatchModelTarget } from '@/lib/watchModelTarget';
import {
  addSourceBuild,
  addVariantToSlot,
  createComponentGroup,
  createFvwcProject,
  createSlotFromGroup,
  deleteComponentGroup,
  deleteComposerSlot,
  deleteComposerVariant,
  parseFvwc,
  resolveCanvasPresentation,
  serializeFvwc,
  selectSlotForFirstSliceExport,
  setBaseBuild,
  setDefaultVariant,
  sha256Text,
  validateComposerProject,
  type ComposerCanvasMode,
  type ComposerSourceBuild,
  type EditableMode,
} from './composerDomain';
import { compileEditableV2Plan } from './editableV2';
import { buildEditableV2Zpk, type EditableZpkBuildResult } from './editableZpkBuilder';
import { signInAdminWithGoogle, subscribeAuthState } from '@/lib/firebaseAuthClient';
import {
  createWorkshopBuild,
  createWorkshopProject,
  dataUrlToBlob,
  fetchWorkshopProjectFile,
} from '@/lib/workshopApi';
import { loadCustomHandStyles, type CustomHandRecord } from '@/lib/customHandStore';
import { hydrateArtifactCustomHands, mergeCustomHandRecords } from './customHandParity';

type ModelDefinition = { name?: string; specGroup?: string };
const modelDefinitions = models as Record<string, ModelDefinition>;
const BUILD_VERSION: string =
  typeof import.meta.env.VITE_APP_BUILD_VERSION === 'string'
  && import.meta.env.VITE_APP_BUILD_VERSION.trim().length > 0
    ? import.meta.env.VITE_APP_BUILD_VERSION.trim()
    : 'dev';

function downloadText(text: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ComposerWorkspace() {
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const fvwcInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const variantCanvasRefs = useRef(new Map<string, HTMLCanvasElement>());
  const aodCanvasRef = useRef<HTMLCanvasElement>(null);
  const workshopDeepLinkLoadedRef = useRef(false);
  const [project, setProject] = useState(() => createFvwcProject());
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [comparisonSourceId, setComparisonSourceId] = useState<string | null>(null);
  const [canvasMode, setCanvasMode] = useState<ComposerCanvasMode>('SOURCE');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [variantMode, setVariantMode] = useState<EditableMode>('STYLE_AND_DATA');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Import two or more current FVWF V1 source projects.');
  const [editableArtifactSummary, setEditableArtifactSummary] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [workshopProjectId, setWorkshopProjectId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('workshopProject'),
  );
  const [workshopBuildId, setWorkshopBuildId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('build'),
  );
  const [workshopResult, setWorkshopResult] = useState<{
    projectId: string;
    buildId: string;
    buildNumber: number;
    installUrl: string;
    qrDataUrl: string;
  } | null>(null);
  const [generatedZpk, setGeneratedZpk] = useState<EditableZpkBuildResult | null>(null);
  const [customHandStyles, setCustomHandStyles] = useState<CustomHandRecord[]>([]);

  useEffect(() => subscribeAuthState((user) => {
    setSignedIn(Boolean(user));
    setAuthChecked(true);
  }), []);

  useEffect(() => {
    void loadCustomHandStyles()
      .then(setCustomHandStyles)
      .catch(() => setMessage('Custom pointer library could not be loaded.'));
  }, []);

  useEffect(() => {
    const prefix = `flowvault.system-b.workshop.${project.id}`;
    const params = new URLSearchParams(window.location.search);
    setWorkshopProjectId(
      params.get('workshopProject') || window.localStorage.getItem(`${prefix}.project`),
    );
    setWorkshopBuildId(
      params.get('build') || window.localStorage.getItem(`${prefix}.build`),
    );
  }, [project.id]);

  useEffect(() => {
    if (workshopDeepLinkLoadedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('workshopProject');
    const buildId = params.get('build');
    if (!projectId || !buildId) return;
    workshopDeepLinkLoadedRef.current = true;

    void (async () => {
      try {
        const text = await fetchWorkshopProjectFile(projectId, buildId);
        const loaded = parseFvwc(text);
        const availableHands = mergeCustomHandRecords(
          await loadCustomHandStyles(),
          loaded.customHandStyles,
        );
        const hydrated = {
          ...loaded,
          sourceBuilds: loaded.sourceBuilds.map((source) => ({
            ...source,
            artifact: hydrateArtifactCustomHands(source.artifact, availableHands).artifact,
          })),
          customHandStyles: availableHands,
        };
        if (!window.confirm(`Open ${hydrated.name || buildId}? This replaces the current Editable Composer project.`)) {
          workshopDeepLinkLoadedRef.current = false;
          return;
        }
        setProject(hydrated);
        setCustomHandStyles(availableHands);
        setSelectedSourceId(hydrated.baseBuildId ?? hydrated.sourceBuilds[0]?.id ?? null);
        setComparisonSourceId(
          hydrated.sourceBuilds.find((source) => source.id !== hydrated.baseBuildId)?.id ?? null,
        );
        setSelectedGroupId(hydrated.componentGroups[0]?.id ?? null);
        setSelectedSlotId(hydrated.slots[0]?.id ?? null);
        setWorkshopProjectId(projectId);
        setWorkshopBuildId(buildId);
        setMessage(`Workshop ${buildId} opened in its original project.`);
      } catch (error) {
        workshopDeepLinkLoadedRef.current = false;
        setMessage(error instanceof Error ? error.message : 'Failed to open Workshop FVWC build.');
      }
    })();
  }, []);

  function persistWorkshopLink(projectId: string, buildId?: string): void {
    const prefix = `flowvault.system-b.workshop.${project.id}`;
    window.localStorage.setItem(`${prefix}.project`, projectId);
    if (buildId) window.localStorage.setItem(`${prefix}.build`, buildId);
    const url = new URL(window.location.href);
    url.searchParams.set('workshopProject', projectId);
    if (buildId) url.searchParams.set('build', buildId);
    window.history.replaceState(null, '', url);
  }

  const selectedSource = project.sourceBuilds.find((source) => source.id === selectedSourceId)
    ?? project.sourceBuilds[0]
    ?? null;
  const comparisonSource = project.sourceBuilds.find((source) => source.id === comparisonSourceId)
    ?? null;
  const selectedSlot = project.slots.find((slot) => slot.id === selectedSlotId) ?? null;
  const issues = useMemo(() => validateComposerProject(project), [project]);

  const canvasPresentation = useMemo(
    () => resolveCanvasPresentation(project, canvasMode, selectedSourceId, selectedSlotId),
    [canvasMode, project, selectedSlotId, selectedSourceId],
  );
  const canvasElements = canvasPresentation.elements;

  async function importFvwfFiles(files: FileList): Promise<void> {
    setBusy(true);
    let next = project;
    const imported: string[] = [];
    try {
      for (const file of [...files]) {
        const text = await file.text();
        const parsedArtifact = parseProjectFileArtifact(text);
        const availableHands = mergeCustomHandRecords(
          customHandStyles,
          project.customHandStyles,
          await loadCustomHandStyles(),
        );
        const { artifact, referencedHands } = hydrateArtifactCustomHands(parsedArtifact, availableHands);
        const target = resolveWatchModelTarget(artifact.watchFaceConfig.watchModel, modelDefinitions);
        if (!target) throw new Error(`${file.name}: unresolved watch model "${artifact.watchFaceConfig.watchModel}".`);
        const canonicalModelName = modelDefinitions[target.modelId]?.name?.trim()
          || artifact.watchFaceConfig.watchModel;
        const normalizedArtifact = {
          ...artifact,
          watchFaceConfig: { ...artifact.watchFaceConfig, watchModel: canonicalModelName },
        };
        const hash = await sha256Text(JSON.stringify(normalizedArtifact));
        const source: ComposerSourceBuild = {
          id: `source_${hash.slice(0, 20)}`,
          fileName: file.name,
          sha256: hash,
          importedAt: new Date().toISOString(),
          canonicalModelId: target.modelId,
          canonicalModelName,
          specGroup: target.specGroup,
          artifact: normalizedArtifact,
        };
        next = addSourceBuild(next, source);
        next = {
          ...next,
          customHandStyles: mergeCustomHandRecords(next.customHandStyles, referencedHands),
        };
        imported.push(source.id);
      }
      setProject(next);
      setCustomHandStyles((current) => mergeCustomHandRecords(current, next.customHandStyles));
      if (!selectedSourceId && imported[0]) setSelectedSourceId(imported[0]);
      if (!comparisonSourceId && imported[1]) setComparisonSourceId(imported[1]);
      setMessage(`Imported ${imported.length} immutable source build${imported.length === 1 ? '' : 's'}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'FVWF import failed.');
    } finally {
      setBusy(false);
    }
  }

  async function loadFvwc(file: File): Promise<void> {
    setBusy(true);
    try {
      const loaded = parseFvwc(await file.text());
      const availableHands = mergeCustomHandRecords(
        await loadCustomHandStyles(),
        loaded.customHandStyles,
      );
      const hydratedSources = loaded.sourceBuilds.map((source) => ({
        ...source,
        artifact: hydrateArtifactCustomHands(source.artifact, availableHands).artifact,
      }));
      const hydrated = { ...loaded, sourceBuilds: hydratedSources, customHandStyles: availableHands };
      setProject(hydrated);
      setCustomHandStyles(availableHands);
      setSelectedSourceId(hydrated.baseBuildId ?? hydrated.sourceBuilds[0]?.id ?? null);
      setComparisonSourceId(hydrated.sourceBuilds.find((source) => source.id !== hydrated.baseBuildId)?.id ?? null);
      setSelectedLayerIds([]);
      setSelectedLayerId(null);
      setSelectedGroupId(hydrated.componentGroups[0]?.id ?? null);
      setSelectedSlotId(hydrated.slots[0]?.id ?? null);
      setCanvasMode('SOURCE');
      const totalElements = hydrated.sourceBuilds.reduce(
        (count, source) => count + source.artifact.watchFaceConfig.elements.length,
        0,
      );
      setMessage(`Opened ${file.name}: ${loaded.sourceBuilds.length} complete source builds, ${totalElements} source elements.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'FVWC load failed.');
    } finally {
      setBusy(false);
    }
  }

  function toggleLayer(id: string): void {
    setSelectedLayerId(id);
    setSelectedLayerIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  function createGroup(): void {
    if (!selectedSource || selectedLayerIds.length === 0) return;
    const defaultName = `Group ${project.componentGroups.length + 1}`;
    const name = window.prompt('Component group name', defaultName)?.trim();
    if (!name) return;
    try {
      const next = createComponentGroup(project, {
        name,
        sourceBuildId: selectedSource.id,
        layerIds: selectedLayerIds,
      });
      setProject(next);
      setSelectedGroupId(next.componentGroups.at(-1)?.id ?? null);
      setSelectedLayerIds([]);
      setMessage(`Created component group "${name}".`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Group creation failed.');
    }
  }

  function createSlot(): void {
    if (!selectedGroupId) return;
    const group = project.componentGroups.find((item) => item.id === selectedGroupId);
    const name = window.prompt('Editable slot name', group?.name ?? 'Editable Slot')?.trim();
    if (!name) return;
    try {
      const next = createSlotFromGroup(project, selectedGroupId, name, variantMode);
      setProject(next);
      setSelectedSlotId(next.slots.at(-1)?.id ?? null);
      setCanvasMode('VARIANT');
      setMessage(`Created editable slot "${name}" with its first default variant.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Slot creation failed.');
    }
  }

  function addVariant(): void {
    if (!selectedSlotId || !selectedGroupId) return;
    try {
      setProject(addVariantToSlot(project, selectedSlotId, selectedGroupId, variantMode));
      setMessage('Added a complete component-group variant.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Variant creation failed.');
    }
  }

  function validateEditablePlan(): void {
    try {
      const plan = compileEditableV2Plan(selectSlotForFirstSliceExport(project, selectedSlotId));
      setEditableArtifactSummary(
        `V2 plan valid · edit_id ${plan.slot.editId} · ${plan.slot.variants.length} variants · ${plan.assets.length + 1} editable assets`,
      );
      setMessage('Editable V2 compilation plan is valid.');
    } catch (error) {
      setEditableArtifactSummary(null);
      setMessage(error instanceof Error ? error.message : 'Editable V2 plan validation failed.');
    }
  }

  async function exportEditableZpk(): Promise<void> {
    setBusy(true);
    try {
      const exportProject = selectSlotForFirstSliceExport(project, selectedSlotId);
      const variantPreviews = Object.fromEntries(
        [...variantCanvasRefs.current.entries()].map(([id, canvas]) => [id, canvas.toDataURL('image/png')]),
      );
      const mainPreview = canvasRef.current?.toDataURL('image/png')
        ?? project.sourceBuilds.find((source) => source.id === project.baseBuildId)?.artifact.backgroundImage;
      const result = await buildEditableV2Zpk(
        exportProject,
        mainPreview ?? null,
        variantPreviews,
      );
      const outer = await JSZip.loadAsync(result.blob);
      const deviceEntry = outer.file('device.zip');
      if (!deviceEntry) throw new Error('Editable package is missing device.zip.');
      const device = await JSZip.loadAsync(await deviceEntry.async('uint8array'));
      const appJsonEntry = device.file('app.json');
      const runtimeEntry = device.file('watchface/index.js');
      if (!appJsonEntry || !runtimeEntry) throw new Error('Editable device archive is incomplete.');
      const appJson = JSON.parse(await appJsonEntry.async('string')) as {
        configVersion?: string;
        module?: { watchface?: { editable?: number } };
      };
      const runtime = await runtimeEntry.async('string');
      if (
        appJson.configVersion !== 'v2'
        || appJson.module?.watchface?.editable !== 1
        || !runtime.includes('WATCHFACE_EDIT_GROUP')
      ) {
        throw new Error('Editable archive verification failed.');
      }
      downloadBlob(result.blob, result.filename);
      setGeneratedZpk(result);
      if (mainPreview) {
        const baseSource = project.sourceBuilds.find((source) => source.id === project.baseBuildId)!;
        let activeProjectId = workshopProjectId;
        if (!activeProjectId) {
          const created = await createWorkshopProject({
            workingTitle: exportProject.name,
            tags: ['editable-watchface', 'fvwc'],
            targetDeviceId: baseSource.canonicalModelId,
          });
          activeProjectId = created.projectId;
          setWorkshopProjectId(activeProjectId);
          persistWorkshopLink(activeProjectId);
        }
        const published = await createWorkshopBuild({
          projectId: activeProjectId,
          workshopLabel: exportProject.name,
          resolution: result.plan.baseConfig.resolution,
          specGroup: baseSource.specGroup,
          deviceId: baseSource.canonicalModelId,
          notes: 'System B editable watchface; source artifact stored in the FVWF slot uses FVWC schema.',
          parentBuildId: workshopBuildId ?? undefined,
          fvwf: new Blob([serializeFvwc(exportProject)], { type: 'application/json' }),
          zpk: result.blob,
          mainPreview: dataUrlToBlob(mainPreview),
          aodPreview: aodCanvasRef.current
            ? dataUrlToBlob(aodCanvasRef.current.toDataURL('image/png'))
            : undefined,
        });
        setWorkshopBuildId(published.buildId);
        persistWorkshopLink(published.projectId, published.buildId);
        setWorkshopResult(published);
      }
      setEditableArtifactSummary(
        `Generated ${result.filename} · ${result.size.toLocaleString()} bytes · edit_id ${result.plan.slot.editId}`,
      );
      setMessage(signedIn
        ? 'Editable ZPK, previews, hosted QR, and Admin build generated.'
        : 'Editable ZPK generated locally. Sign in to also create the hosted QR and Admin build.');
    } catch (error) {
      setEditableArtifactSummary(null);
      setMessage(error instanceof Error ? error.message : 'Editable V2 export failed.');
    } finally {
      setBusy(false);
    }
  }

  const activeSource = canvasPresentation.source;
  const activeConfig = activeSource?.artifact.watchFaceConfig;
  const activeBackground = activeSource?.artifact.backgroundImage || activeConfig?.background.src;

  if (!authChecked) {
    return <main className="system-b-auth"><p>Checking private access…</p></main>;
  }

  function removeGroup(groupId: string): void {
    try {
      setProject(deleteComponentGroup(project, groupId));
      if (selectedGroupId === groupId) setSelectedGroupId(null);
      setMessage('Component group deleted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Group deletion failed.');
    }
  }

  function removeSlot(slotId: string): void {
    try {
      const next = deleteComposerSlot(project, slotId);
      setProject(next);
      if (selectedSlotId === slotId) setSelectedSlotId(next.slots[0]?.id ?? null);
      setMessage('Editable slot deleted. Its component groups are now available for deletion.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Slot deletion failed.');
    }
  }

  function removeVariant(slotId: string, variantId: string): void {
    try {
      setProject(deleteComposerVariant(project, slotId, variantId));
      setMessage('Variant deleted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Variant deletion failed.');
    }
  }

  if (!signedIn) {
    return (
      <main className="system-b-auth">
        <p className="system-b-eyebrow">FLOWVAULT · PRIVATE SYSTEM B</p>
        <h1>Sign in to create editable watchfaces</h1>
        <p>The same Firebase identity used by Studio and Admin is required.</p>
        <button type="button" onClick={() => void signInAdminWithGoogle()}>
          Sign in with Google
        </button>
      </main>
    );
  }

  return (
    <main className="system-b-shell composer-shell">
      <header className="system-b-toolbar">
        <div>
          <p className="system-b-eyebrow">FLOWVAULT · SYSTEM B · FVWC</p>
          <h1>Editable Watchface Composer</h1>
          <span className="system-b-build-version">
            AI-Powered ZeppOS Designer &nbsp;·&nbsp; <span className="font-mono text-zinc-400">{BUILD_VERSION}</span>
          </span>
        </div>
        <div className="system-b-actions">
          <input
            ref={sourceInputRef}
            hidden
            type="file"
            accept=".fvwf,.json"
            multiple
            onChange={(event) => {
              if (event.target.files?.length) void importFvwfFiles(event.target.files);
              event.target.value = '';
            }}
          />
          <input
            ref={fvwcInputRef}
            hidden
            type="file"
            accept=".fvwc,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void loadFvwc(file);
              event.target.value = '';
            }}
          />
          <button type="button" onClick={() => sourceInputRef.current?.click()} disabled={busy}>Import FVWF builds</button>
          <button type="button" onClick={() => fvwcInputRef.current?.click()} disabled={busy}>Open FVWC</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => downloadText(serializeFvwc(project), `${project.name.replace(/\s+/g, '_')}.fvwc`)}
          >
            Save FVWC
          </button>
          <button type="button" onClick={validateEditablePlan} disabled={busy}>Validate editable V2</button>
          <button type="button" onClick={() => void exportEditableZpk()} disabled={busy}>
            Generate ZPK, previews &amp; QR
          </button>
        </div>
      </header>

      <p className="system-b-message" role="status">{busy ? 'Working…' : message}</p>
      {workshopResult && (
        <section className="composer-publish-result">
          <img src={workshopResult.qrDataUrl} alt="Install editable watchface QR code" />
          <div>
            <strong>Workshop build #{workshopResult.buildNumber}</strong>
            <span>Project {workshopResult.projectId}</span>
            <span>Build {workshopResult.buildId}</span>
            <a href={workshopResult.installUrl}>Open hosted install link</a>
            <a href="/Watch-Faces/admin">
              Open in Admin
            </a>
          </div>
        </section>
      )}
      {generatedZpk && (
        <section className="composer-local-result">
          <strong>Local ZPK ready</strong>
          <button type="button" onClick={() => downloadBlob(generatedZpk.blob, generatedZpk.filename)}>
            Download {generatedZpk.filename}
          </button>
        </section>
      )}

      <nav className="composer-modebar" aria-label="Canvas mode">
        {(['SOURCE', 'OVERLAY', 'BASE', 'VARIANT', 'COMBINATION'] as ComposerCanvasMode[]).map((mode) => (
          <button
            type="button"
            key={mode}
            className={canvasMode === mode ? 'active' : ''}
            onClick={() => setCanvasMode(mode)}
          >
            {mode}
          </button>
        ))}
      </nav>

      <section className="composer-layout">
        <aside className="composer-panel">
          <h2>Source builds</h2>
          <div className="composer-stack">
            {project.sourceBuilds.map((source) => (
              <button
                type="button"
                key={source.id}
                className={`source-card ${selectedSource?.id === source.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedSourceId(source.id);
                  setSelectedLayerIds([]);
                  setSelectedLayerId(null);
                }}
              >
                <strong>{source.artifact.watchFaceConfig.name}</strong>
                <span>{source.canonicalModelName}</span>
                <span>{source.sha256.slice(0, 10)}</span>
                {project.baseBuildId === source.id && <em>BASE</em>}
              </button>
            ))}
          </div>
          {selectedSource && (
            <button
              type="button"
              className="composer-primary"
              onClick={() => setProject(setBaseBuild(project, selectedSource.id))}
            >
              Set selected as base
            </button>
          )}
          <label>
            Overlay comparison
            <select value={comparisonSourceId ?? ''} onChange={(event) => setComparisonSourceId(event.target.value || null)}>
              <option value="">None</option>
              {project.sourceBuilds.map((source) => (
                <option key={source.id} value={source.id}>{source.artifact.watchFaceConfig.name}</option>
              ))}
            </select>
          </label>
          <h2>Layers</h2>
          {selectedSource && (
            <ElementList
              elements={selectedSource.artifact.watchFaceConfig.elements}
              selectedElementId={selectedLayerId}
              extraSelectedIds={selectedLayerIds}
              onSelectElement={toggleLayer}
              onMultiToggle={toggleLayer}
            />
          )}
          <button type="button" className="composer-primary" disabled={!selectedLayerIds.length} onClick={createGroup}>
            Create Component Group ({selectedLayerIds.length})
          </button>
        </aside>

        <section className={`composer-canvas-mode mode-${canvasMode.toLowerCase()}`}>
          {activeConfig ? (
            <>
              <InteractiveCanvas
                ref={canvasRef}
                backgroundImage={activeBackground}
                backgroundTransform={activeConfig.backgroundTransform ?? undefined}
                elements={canvasElements}
                selectedElementId={selectedLayerId}
                extraSelectedIds={selectedLayerIds}
                onSelectElement={(id) => id && toggleLayer(id)}
                onMultiToggle={toggleLayer}
                canvasW={activeConfig.resolution.width}
                canvasH={activeConfig.resolution.height}
                canvasShape={activeSource?.specGroup.includes('square') ? 'square' : 'round'}
                customHandStyles={customHandStyles}
                showGrid
              />
              {canvasMode === 'OVERLAY' && comparisonSource && (
                <div className="comparison-overlay" aria-label="Comparison overlay">
                  <InteractiveCanvas
                    backgroundImage={comparisonSource.artifact.backgroundImage || comparisonSource.artifact.watchFaceConfig.background.src}
                    backgroundTransform={comparisonSource.artifact.watchFaceConfig.backgroundTransform ?? undefined}
                    elements={comparisonSource.artifact.watchFaceConfig.elements}
                    canvasW={comparisonSource.artifact.watchFaceConfig.resolution.width}
                    canvasH={comparisonSource.artifact.watchFaceConfig.resolution.height}
                    canvasShape={comparisonSource.specGroup.includes('square') ? 'square' : 'round'}
                    customHandStyles={customHandStyles}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="system-b-empty">
              <h2>No source builds</h2>
              <p>Import current FVWF V1 files. Sources remain immutable.</p>
            </div>
          )}
        </section>

        <aside className="composer-panel">
          <h2>Component groups</h2>
          <div className="composer-stack">
            {project.componentGroups.map((group) => (
              <div className="composer-entity-row" key={group.id}>
                <button
                  type="button"
                  className={`group-card ${selectedGroupId === group.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedGroupId(group.id);
                    setSelectedSourceId(group.sourceBuildId);
                  }}
                >
                  <strong>{group.name}</strong>
                  <span>{group.layerIds.length} layers</span>
                </button>
                <button type="button" className="composer-delete" onClick={() => removeGroup(group.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
          <label>
            Variant mode
            <select value={variantMode} onChange={(event) => setVariantMode(event.target.value as EditableMode)}>
              <option value="DATA_ONLY">Data only</option>
              <option value="STYLE_ONLY">Style only</option>
              <option value="STYLE_AND_DATA">Style and data</option>
            </select>
          </label>
          <button type="button" className="composer-primary" disabled={!selectedGroupId} onClick={createSlot}>
            Create slot from group
          </button>

          <h2>Editable slots</h2>
          <div className="composer-stack">
            {project.slots.map((slot) => (
              <div className="composer-entity-row" key={slot.id}>
                <button
                  type="button"
                  className={`slot-card ${selectedSlotId === slot.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedSlotId(slot.id);
                    setCanvasMode('VARIANT');
                  }}
                >
                  <strong>{slot.name}</strong>
                  <span>{slot.family}</span>
                  <span>{slot.variants.length} variants</span>
                </button>
                <button type="button" className="composer-delete" onClick={() => removeSlot(slot.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="composer-primary"
            disabled={!selectedSlotId || !selectedGroupId}
            onClick={addVariant}
          >
            Add selected group as variant
          </button>

          {selectedSlot && (
            <div className="variant-list">
              {selectedSlot.variants.map((variant) => (
                <div className="composer-entity-row" key={variant.id}>
                  <label>
                    <input
                      type="radio"
                      name={`default-${selectedSlot.id}`}
                      checked={selectedSlot.defaultVariantId === variant.id}
                      onChange={() => setProject(setDefaultVariant(project, selectedSlot.id, variant.id))}
                    />
                    <span><strong>{variant.name}</strong><small>{variant.mode}</small></span>
                  </label>
                  <button
                    type="button"
                    className="composer-delete"
                    onClick={() => removeVariant(selectedSlot.id, variant.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>
      </section>

      <section className="composer-validation">
        <h2>Validation</h2>
        <div className="validation-summary">
          <strong>{issues.filter((issue) => issue.severity === 'ERROR').length} errors</strong>
          <span>{issues.filter((issue) => issue.severity === 'WARNING').length} warnings</span>
          <span>{issues.filter((issue) => issue.severity === 'INFO').length} info</span>
        </div>
        <ul>
          {issues.map((issue, index) => (
            <li key={`${issue.code}-${index}`} data-severity={issue.severity}>
              <strong>{issue.severity}</strong> {issue.message}
            </li>
          ))}
          {issues.length === 0 && <li data-severity="INFO"><strong>VALID</strong> FVWC authoring invariants pass.</li>}
        </ul>
        {editableArtifactSummary && <p className="editable-artifact-summary">{editableArtifactSummary}</p>}
      </section>
      <div className="composer-export-canvases" aria-hidden="true">
        {selectedSlot?.variants.map((variant) => {
          const source = project.sourceBuilds.find((item) => item.id === variant.sourceBuildId);
          const group = project.componentGroups.find((item) => item.id === variant.componentGroupId);
          if (!source || !group) return null;
          const config = source.artifact.watchFaceConfig;
          return (
            <InteractiveCanvas
              key={variant.id}
              ref={(canvas) => {
                if (canvas) variantCanvasRefs.current.set(variant.id, canvas);
                else variantCanvasRefs.current.delete(variant.id);
              }}
              backgroundImage={source.artifact.backgroundImage || config.background.src}
              backgroundTransform={config.backgroundTransform ?? undefined}
              elements={config.elements}
              canvasW={config.resolution.width}
              canvasH={config.resolution.height}
              canvasShape={source.specGroup.includes('square') ? 'square' : 'round'}
              customHandStyles={customHandStyles}
            />
          );
        })}
        {(() => {
          const defaultVariant = selectedSlot?.variants.find((variant) => variant.id === selectedSlot.defaultVariantId);
          const source = project.sourceBuilds.find((item) => item.id === defaultVariant?.sourceBuildId)
            ?? project.sourceBuilds.find((item) => item.id === project.baseBuildId);
          const config = source?.artifact.watchFaceConfig;
          if (!source || !config?.aodElements?.length) return null;
          return (
            <InteractiveCanvas
              ref={aodCanvasRef}
              elements={config.aodElements}
              canvasW={config.resolution.width}
              canvasH={config.resolution.height}
              canvasShape={source.specGroup.includes('square') ? 'square' : 'round'}
              customHandStyles={customHandStyles}
            />
          );
        })()}
      </div>
    </main>
  );
}
