import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Database, Star, Trash2, FlaskConical, FolderOpen, Download, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminPanel } from '@/components/AdminPanel';
import {
  fetchAdminCatalogFromFirebase,
  fetchCatalogFromFirebase,
  fetchPublicConfig,
  fetchStorefrontConfigFromFirebase,
  adminUpdateConfigInFirebase,
  patchCatalogSpecGroupsInFirebase,
  setCatalogStatusInFirebase,
  deleteZpkEntryInFirebase,
  writeStorefrontConfigToFirebase,
} from '@/lib/studioFirebasePublishApi';
import { Button } from '@/components/ui/button';
import { isFirebaseAuthConfigured } from '@/lib/firebaseAuthClient';
import type { CatalogEntry, SpecGroup } from '@/context/CatalogContext';
import { storeArchitectureFlags } from '@/lib/storeArchitecture';
import {
  approveWorkshopBuild,
  fetchWorkshopProjects,
  getWorkshopArtifactUrl,
  type WorkshopProjectSummary,
} from '@/lib/workshopApi';

export function AdminOpsPage() {
  const backendMode = isFirebaseAuthConfigured();
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;
  const functionsBase = (
    (import.meta.env.VITE_FIREBASE_FUNCTIONS_BASE_URL as string | undefined) ||
    (import.meta.env.VITE_PURCHASE_FUNCTIONS_BASE_URL as string | undefined) || ''
  ).replace(/\/$/, '');
  function previewUrl(id: string) {
    return functionsBase ? `${functionsBase}/publicAsset?kind=preview&id=${encodeURIComponent(id)}` : '';
  }

  const [patching, setPatching] = useState(false);
  const [uploadingConfig, setUploadingConfig] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogOptions, setCatalogOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [featuredFaceId, setFeaturedFaceId] = useState<string>('');
  const [savingFeatured, setSavingFeatured] = useState(false);
  const [adminCatalog, setAdminCatalog] = useState<CatalogEntry[]>([]);
  const [loadingAdminCatalog, setLoadingAdminCatalog] = useState(false);
  const [updatingCatalogId, setUpdatingCatalogId] = useState<string | null>(null);
  const [deletingCatalogId, setDeletingCatalogId] = useState<string | null>(null);
  const [catalogFilter, setCatalogFilter] = useState<'ALL' | 'ENABLED' | 'OFFLINE'>('ALL');
  const [workshopProjects, setWorkshopProjects] = useState<WorkshopProjectSummary[]>([]);
  const [loadingWorkshop, setLoadingWorkshop] = useState(false);
  const [workshopBusyId, setWorkshopBusyId] = useState<string | null>(null);

  const canRun = Boolean(backendMode);

  async function loadWorkshop() {
    if (!canRun) return;
    setLoadingWorkshop(true);
    try {
      setWorkshopProjects(await fetchWorkshopProjects());
      toast.success('Workshop projects loaded.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load Workshop');
    } finally {
      setLoadingWorkshop(false);
    }
  }

  async function downloadWorkshopArtifact(projectId: string, buildId: string, kind: 'fvwf' | 'zpk') {
    setWorkshopBusyId(buildId);
    try {
      const url = await getWorkshopArtifactUrl({ projectId, buildId, kind });
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open Workshop artifact');
    } finally {
      setWorkshopBusyId(null);
    }
  }

  async function approveBuild(projectId: string, buildId: string) {
    setWorkshopBusyId(buildId);
    try {
      await approveWorkshopBuild(projectId, buildId);
      setWorkshopProjects((projects) => projects.map((project) => ({
        ...project,
        builds: project.builds.map((build) => build.id === buildId ? { ...build, state: 'APPROVED' } : build),
      })));
      toast.success(`${buildId} approved.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve build');
    } finally {
      setWorkshopBusyId(null);
    }
  }

  async function loadCatalogData() {
    if (!canRun) return;

    setLoadingCatalog(true);
    try {
      const [catalog, storefrontConfig] = await Promise.all([
        fetchCatalogFromFirebase(),
        fetchStorefrontConfigFromFirebase(),
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

  async function handleRunSpecGroupPatch() {
    if (!canRun) {
      toast.error('Configure Firebase auth/backend first.');
      return;
    }

    setPatching(true);
    try {
      // validSpecGroups — load from Firebase Storage (canonical source)
      const specGroupsJson = await fetchPublicConfig<Record<string, SpecGroup>>('specGroups').catch(() => ({}));
      const validSpecGroups = Object.keys(specGroupsJson);

      // The patch function now loads models.json internally from Storage.
      // No need to pass watchModelMap from the UI.
      const result = await patchCatalogSpecGroupsInFirebase({ validSpecGroups });
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

  async function handleSaveFeaturedFace() {
    if (!canRun) {
      toast.error('Configure Firebase auth/backend first.');
      return;
    }

    setSavingFeatured(true);
    try {
      await writeStorefrontConfigToFirebase({
        featuredFaceId: featuredFaceId || null,
      });
      toast.success('Featured watchface updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save featured watchface');
    } finally {
      setSavingFeatured(false);
    }
  }

  async function handleUploadConfig() {
    if (!canRun) { toast.error('Configure Firebase auth/backend first.'); return; }
    setUploadingConfig(true);
    try {
      const [modelsRes, specGroupsRes] = await Promise.all([
        fetch(`${import.meta.env.BASE_URL}models.json`),
        fetch(`${import.meta.env.BASE_URL}specGroups.json`),
      ]);
      if (!modelsRes.ok || !specGroupsRes.ok) throw new Error('Could not read local models/specGroups.json');
      const [modelsData, specGroupsData] = await Promise.all([modelsRes.json(), specGroupsRes.json()]);
      await Promise.all([
        adminUpdateConfigInFirebase({ file: 'models', data: modelsData }),
        adminUpdateConfigInFirebase({ file: 'specGroups', data: specGroupsData }),
      ]);
      toast.success('models.json and specGroups.json uploaded to Firebase Storage.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Config upload failed');
    } finally {
      setUploadingConfig(false);
    }
  }

  async function loadAdminCatalog() {
    if (!canRun) return;

    setLoadingAdminCatalog(true);
    try {
      const entries = await fetchAdminCatalogFromFirebase();
      setAdminCatalog(entries);
      toast.success('Admin catalog loaded.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load admin catalog');
    } finally {
      setLoadingAdminCatalog(false);
    }
  }

  async function setCatalogStatus(watchfaceId: string, status: 'ENABLED' | 'OFFLINE') {
    if (!canRun) return;

    setUpdatingCatalogId(watchfaceId);
    try {
      await setCatalogStatusInFirebase({ watchfaceId, status });
      setAdminCatalog((prev) =>
        prev.map((entry) =>
          entry.id === watchfaceId
            ? { ...entry, storeStatus: status, published: status === 'ENABLED' }
            : entry
        )
      );
      toast.success(`${watchfaceId} set to ${status}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update catalog status');
    } finally {
      setUpdatingCatalogId(null);
    }
  }

  async function deleteZpkEntry(watchfaceId: string, currentStatus: 'ENABLED' | 'OFFLINE') {
    if (!canRun) return;
    if (currentStatus !== 'OFFLINE') {
      toast.error('Set the watchface to Offline before deleting.');
      return;
    }
    if (!window.confirm(`Delete "${watchfaceId}" permanently? This cannot be undone.`)) return;

    setDeletingCatalogId(watchfaceId);
    try {
      await deleteZpkEntryInFirebase({ watchfaceId });
      setAdminCatalog((prev) => prev.filter((entry) => entry.id !== watchfaceId));
      toast.success(`${watchfaceId} deleted.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete entry');
    } finally {
      setDeletingCatalogId(null);
    }
  }

  const filteredAdminCatalog = adminCatalog.filter((entry) => {
    const status = entry.storeStatus ?? (entry.published === false ? 'OFFLINE' : 'ENABLED');
    if (catalogFilter === 'ALL') return true;
    return status === catalogFilter;
  });

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
              Run Firebase catalog maintenance tools without opening the studio page.
            </p>
          </div>
          <Link to="/" className="text-sm text-[#d2b37a] hover:text-[#efd5a7] underline underline-offset-4">
            Back to store
          </Link>
        </div>
        <div className="mt-6 rounded-xl border border-[#2d3542] bg-[#0d1117] p-4 text-xs text-[#8f9aac]">
          {backendMode
            ? 'Firebase-backed admin mode active. All operations run through authenticated Firebase endpoints.'
            : 'Firebase Auth is not configured for this build.'}
        </div>

        {storeArchitectureFlags.workshop && (
          <div className="mt-6 rounded-xl border border-cyan-900/70 bg-[#0d1117] p-4 space-y-3">
            <div className="flex items-center gap-2 text-[#dce3ee] text-sm font-medium">
              <FlaskConical className="h-4 w-4 text-cyan-400" />
              Workshop Projects
            </div>
            <p className="text-xs text-[#8f9aac]">
              Exact editable FVWF snapshots paired with the exact ZPK installed for physical-watch testing. Store metadata is not required here.
            </p>
            <Button onClick={loadWorkshop} disabled={!canRun || loadingWorkshop} variant="outline" className="h-10 border-cyan-900 text-cyan-200 hover:bg-cyan-950/40">
              <FolderOpen className="h-4 w-4 mr-2" />
              {loadingWorkshop ? 'Loading Workshop...' : 'Load Workshop'}
            </Button>
            <div className="space-y-3">
              {workshopProjects.map((project) => (
                <div key={project.id} className="rounded-lg border border-[#2c3340] bg-[#10151c] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#e9edf5]">{project.workingTitle}</p>
                      <p className="text-[10px] font-mono text-[#6b7a8d]">{project.id} · {project.buildCount} builds · {(project.storageBytes / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {project.builds.map((build) => {
                      const busy = workshopBusyId === build.id;
                      return (
                        <div key={build.id} className="flex flex-wrap items-center gap-2 rounded border border-[#252d38] px-3 py-2 text-xs">
                          <div className="min-w-[180px] flex-1">
                            <p className="text-[#e9edf5]">Build {String(build.buildNumber).padStart(3, '0')} · {build.workshopLabel}</p>
                            <p className="text-[10px] text-[#738095]">{build.state} · {build.resolution.width}×{build.resolution.height} · {(build.storageBytes / 1024 / 1024).toFixed(1)} MB</p>
                          </div>
                          <a
                            href={`${import.meta.env.BASE_URL}studio?workshopProject=${encodeURIComponent(project.id)}&build=${encodeURIComponent(build.id)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded border border-cyan-900 px-2 py-1 text-cyan-300 hover:bg-cyan-950/40"
                          >
                            Open in Studio
                          </a>
                          <Button onClick={() => downloadWorkshopArtifact(project.id, build.id, 'fvwf')} disabled={busy} variant="outline" className="h-8 border-[#3b4d68] text-[#dbe7f7]">
                            <Download className="h-3.5 w-3.5 mr-1" /> FVWF
                          </Button>
                          <Button onClick={() => downloadWorkshopArtifact(project.id, build.id, 'zpk')} disabled={busy} variant="outline" className="h-8 border-[#3b4d68] text-[#dbe7f7]">
                            <Download className="h-3.5 w-3.5 mr-1" /> Test ZPK
                          </Button>
                          <Button onClick={() => approveBuild(project.id, build.id)} disabled={busy || build.state === 'APPROVED'} variant="outline" className="h-8 border-emerald-900 text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
            Config Files (Firebase Storage — Single Source of Truth)
          </div>
          <p className="text-xs text-[#8f9aac]">
            Uploads the bundled <code>models.json</code> and <code>specGroups.json</code> to Firebase Storage (<code>config/</code>). Run this after any model matrix changes.
          </p>
          <Button
            onClick={handleUploadConfig}
            disabled={!canRun || uploadingConfig}
            className="h-10 bg-[#1d2736] hover:bg-[#263448] text-[#ecf2ff] border border-[#3b4d68]"
          >
            {uploadingConfig ? 'Uploading Config...' : 'Upload Config to Storage'}
          </Button>
        </div>

        <div className="mt-6 rounded-xl border border-[#2d3542] bg-[#0d1117] p-4 space-y-3">
          <div className="flex items-center gap-2 text-[#dce3ee] text-sm font-medium">
            <Database className="h-4 w-4 text-[#d2b37a]" />
            SpecGroup Backfill Patch
          </div>
          <p className="text-xs text-[#8f9aac]">
            Repairs unknown catalog specGroup values using uploaded source metadata from Firebase Storage.
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

        <div className="mt-6 rounded-xl border border-[#2d3542] bg-[#0d1117] p-4 space-y-3">
          <div className="flex items-center gap-2 text-[#dce3ee] text-sm font-medium">
            <Database className="h-4 w-4 text-[#d2b37a]" />
            Catalog Lifecycle (Soft Delete)
          </div>
          <p className="text-xs text-[#8f9aac]">
            Set watchfaces offline to remove from store without deleting database/storage records. Restore anytime by enabling again.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={loadAdminCatalog}
              disabled={!canRun || loadingAdminCatalog}
              variant="outline"
              className="h-10 border-[#3b4d68] text-[#ecf2ff] hover:bg-[#263448]"
            >
              {loadingAdminCatalog ? 'Loading Admin Catalog...' : 'Load Full Catalog'}
            </Button>

            <select
              value={catalogFilter}
              onChange={(e) => setCatalogFilter(e.target.value as 'ALL' | 'ENABLED' | 'OFFLINE')}
              className="rounded-lg border border-[#343d4b] bg-[#0d1015] px-3 py-2 text-sm text-[#e8edf6] focus:outline-none focus:border-[#9f8557]"
            >
              <option value="ALL">All statuses</option>
              <option value="ENABLED">Enabled only</option>
              <option value="OFFLINE">Offline only</option>
            </select>
          </div>

          {filteredAdminCatalog.length > 0 && (
            <div className="max-h-72 overflow-auto rounded-lg border border-[#2c3340]">
              <table className="w-full text-xs">
                <thead className="bg-[#161d27] text-[#9ba6b8]">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Preview</th>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdminCatalog.map((entry) => {
                    const status = entry.storeStatus ?? (entry.published === false ? 'OFFLINE' : 'ENABLED');
                    const rowBusy = updatingCatalogId === entry.id || deletingCatalogId === entry.id;
                    return (
                      <tr key={entry.id} className="border-t border-[#202632] text-[#e9edf5]">
                        <td className="px-3 py-2">
                          {previewUrl(entry.id) ? (
                            <img
                              src={previewUrl(entry.id)}
                              alt={entry.name}
                              className="h-12 w-12 rounded object-cover bg-[#1a2030]"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded bg-[#1a2030]" />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{entry.name}</div>
                          <div className="text-[10px] text-[#6b7a8d] font-mono">{entry.id}</div>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded px-2 py-0.5 ${status === 'ENABLED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right space-x-2">
                          <Button
                            onClick={() => setCatalogStatus(entry.id, 'ENABLED')}
                            disabled={!canRun || rowBusy || status === 'ENABLED'}
                            variant="outline"
                            className="h-8 border-[#345045] text-[#ccf2de] hover:bg-[#20382f]"
                          >
                            Enable
                          </Button>
                          <Button
                            onClick={() => setCatalogStatus(entry.id, 'OFFLINE')}
                            disabled={!canRun || rowBusy || status === 'OFFLINE'}
                            variant="outline"
                            className="h-8 border-[#5a4631] text-[#f5dfc2] hover:bg-[#3a2c1f]"
                          >
                            Set Offline
                          </Button>
                          <Button
                            onClick={() => deleteZpkEntry(entry.id, status)}
                            disabled={!canRun || rowBusy || status !== 'OFFLINE'}
                            variant="outline"
                            title={status !== 'OFFLINE' ? 'Set to Offline before deleting' : 'Delete permanently'}
                            className="h-8 border-red-900 text-red-400 hover:bg-red-950 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {canRun && (
        <AdminPanel />
      )}
    </section>
  );
}
