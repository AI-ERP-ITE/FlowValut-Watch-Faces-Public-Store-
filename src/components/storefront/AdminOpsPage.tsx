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
  fetchStorageMaintenanceReport,
  setCatalogLifecycleInFirebase,
  type StorageMaintenanceReport,
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
  permanentlyDeleteWorkshopBuild,
  type WorkshopProjectSummary,
  setWorkshopBuildLifecycle,
  updateWorkshopProject,
} from '@/lib/workshopApi';
import { canRestoreCatalog, canTrashCatalog, formatStorageBytes, permanentDeleteConfirmation, type CatalogLifecycleStatus } from '@/lib/catalogLifecycle';
import { ReleaseWizard } from '@/components/ReleaseWizard';
import { applyLegacyMigration, auditLegacyZpkPage, dryRunLegacyMigration, fetchLegacyClassificationQueue, type LegacyClassificationEntry, type LegacyMigrationReport, type LegacyZpkAuditEntry } from '@/lib/legacyMigrationApi';

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
  const [catalogFilter, setCatalogFilter] = useState<'ALL' | CatalogLifecycleStatus>('ALL');
  const [maintenanceReport, setMaintenanceReport] = useState<StorageMaintenanceReport | null>(null);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [workshopProjects, setWorkshopProjects] = useState<WorkshopProjectSummary[]>([]);
  const [loadingWorkshop, setLoadingWorkshop] = useState(false);
  const [workshopBusyId, setWorkshopBusyId] = useState<string | null>(null);
  const [releaseBuild, setReleaseBuild] = useState<{ projectId: string; buildId: string; target?: string } | null>(null);
  const [migrationReport, setMigrationReport] = useState<LegacyMigrationReport | null>(null);
  const [migrationQueue, setMigrationQueue] = useState<LegacyClassificationEntry[]>([]);
  const [migrationBusy, setMigrationBusy] = useState(false);
  const [zpkAudit, setZpkAudit] = useState<LegacyZpkAuditEntry[]>([]);
  const [zpkAuditCursor, setZpkAuditCursor] = useState<string | null | undefined>(undefined);

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

  async function editWorkshopProject(project: WorkshopProjectSummary) {
    const workingTitle = window.prompt('Workshop working title', project.workingTitle)?.trim();
    if (!workingTitle) return;
    const folder = window.prompt('Optional folder / group', project.folder ?? '')?.trim() ?? '';
    const notes = window.prompt('Optional project notes', project.notes ?? '') ?? '';
    setWorkshopBusyId(project.id);
    try {
      await updateWorkshopProject({ projectId: project.id, workingTitle, folder, notes, tags: project.tags ?? [] });
      setWorkshopProjects((projects) => projects.map((item) => item.id === project.id ? { ...item, workingTitle, folder, notes } : item));
      toast.success('Workshop project details updated.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to update Workshop project'); }
    finally { setWorkshopBusyId(null); }
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

  async function changeWorkshopLifecycle(projectId: string, buildId: string, action: 'TRASH' | 'RESTORE') {
    const reason = action === 'TRASH' ? window.prompt('Why is this test build being moved to Trash?')?.trim() : undefined;
    if (action === 'TRASH' && !reason) return;
    setWorkshopBusyId(buildId);
    try {
      const result = await setWorkshopBuildLifecycle(projectId, buildId, action, reason);
      setWorkshopProjects((projects) => projects.map((project) => ({ ...project, builds: project.builds.map((build) => build.id === buildId ? { ...build, state: result.state } : build) })));
      toast.success(`${buildId} ${action === 'TRASH' ? 'moved to Trash' : 'restored'}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Workshop lifecycle update failed');
    } finally {
      setWorkshopBusyId(null);
    }
  }

  async function deleteWorkshopBuildPermanently(projectId: string, buildId: string) {
    const confirmation = `DELETE ${projectId}/${buildId}`;
    if (window.prompt(`Permanent deletion removes the private FVWF, Test ZPK, and previews. Type: ${confirmation}`) !== confirmation) return;
    setWorkshopBusyId(buildId);
    try {
      await permanentlyDeleteWorkshopBuild(projectId, buildId, confirmation);
      setWorkshopProjects((projects) => projects.map((project) => ({
        ...project,
        builds: project.builds.filter((build) => build.id !== buildId),
      })));
      if (releaseBuild?.projectId === projectId && releaseBuild.buildId === buildId) setReleaseBuild(null);
      toast.success(`${buildId} permanently deleted.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Workshop permanent deletion failed');
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

  async function changeCatalogLifecycle(watchfaceId: string, action: 'TRASH' | 'RESTORE') {
    setDeletingCatalogId(watchfaceId);
    try {
      const result = await setCatalogLifecycleInFirebase({ watchfaceId, action });
      setAdminCatalog((prev) => prev.map((entry) => entry.id === watchfaceId ? { ...entry, storeStatus: result.status, published: false } : entry));
      toast.success(`${watchfaceId} ${action === 'TRASH' ? 'moved to Trash' : 'restored Offline'}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lifecycle update failed');
    } finally {
      setDeletingCatalogId(null);
    }
  }

  async function deleteZpkEntry(watchfaceId: string, currentStatus: CatalogLifecycleStatus) {
    if (!canRun) return;
    if (currentStatus !== 'TRASHED') {
      toast.error('Move the watchface to Trash before deleting permanently.');
      return;
    }
    const required = permanentDeleteConfirmation(watchfaceId);
    if (window.prompt(`Permanent deletion cannot be undone. Type: ${required}`) !== required) return;

    setDeletingCatalogId(watchfaceId);
    try {
      await deleteZpkEntryInFirebase({ watchfaceId, confirmation: required });
      setAdminCatalog((prev) => prev.filter((entry) => entry.id !== watchfaceId));
      toast.success(`${watchfaceId} deleted.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete entry');
    } finally {
      setDeletingCatalogId(null);
    }
  }

  async function runStorageMaintenance() {
    setLoadingMaintenance(true);
    try {
      setMaintenanceReport(await fetchStorageMaintenanceReport());
      toast.success('Storage dry-run completed. Nothing was deleted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Storage scan failed');
    } finally {
      setLoadingMaintenance(false);
    }
  }

  async function runMigrationDryRun() {
    setMigrationBusy(true);
    try { setMigrationReport(await dryRunLegacyMigration()); toast.success('Legacy migration dry-run saved. No catalog records changed.'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Migration dry-run failed'); }
    finally { setMigrationBusy(false); }
  }

  async function applyMigration() {
    if (!migrationReport) return;
    const confirmation = window.prompt(`This creates additive temporary hierarchy records. Legacy records, orders, tokens, and files remain unchanged. Type: ${migrationReport.requiredConfirmation}`);
    if (confirmation !== migrationReport.requiredConfirmation) return;
    setMigrationBusy(true);
    try { const result = await applyLegacyMigration(migrationReport.reportId, confirmation); toast.success(`Backfilled ${result.migrated} one-to-one temporary products.`); setMigrationQueue(await fetchLegacyClassificationQueue()); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Migration apply failed'); }
    finally { setMigrationBusy(false); }
  }

  async function loadMigrationQueue() {
    setMigrationBusy(true);
    try { setMigrationQueue(await fetchLegacyClassificationQueue()); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not load classification queue'); }
    finally { setMigrationBusy(false); }
  }

  async function runZpkAudit(reset = false) {
    setMigrationBusy(true);
    try {
      const page = await auditLegacyZpkPage(reset ? undefined : zpkAuditCursor ?? undefined);
      setZpkAudit((current) => reset ? page.results : [...current, ...page.results]);
      setZpkAuditCursor(page.nextCursor);
      toast.success(`Audited ${page.results.length} ZPK files without changes.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'ZPK audit failed'); }
    finally { setMigrationBusy(false); }
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
                    <Button onClick={() => editWorkshopProject(project)} disabled={workshopBusyId === project.id} variant="outline" className="h-8 border-[#3b4d68] text-[#dbe7f7]">Edit Project</Button>
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
                          <Button onClick={() => approveBuild(project.id, build.id)} disabled={busy || build.state !== 'TESTING'} variant="outline" className="h-8 border-emerald-900 text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          {build.state === 'TRASHED' ? (
                            <>
                              <Button onClick={() => changeWorkshopLifecycle(project.id, build.id, 'RESTORE')} disabled={busy} variant="outline" className="h-8 border-amber-800 text-amber-300">Restore</Button>
                              <Button onClick={() => deleteWorkshopBuildPermanently(project.id, build.id)} disabled={busy} variant="outline" className="h-8 border-red-900 text-red-400">Delete Permanently</Button>
                            </>
                          ) : (
                            <Button onClick={() => changeWorkshopLifecycle(project.id, build.id, 'TRASH')} disabled={busy || build.state === 'PROMOTED'} variant="outline" className="h-8 border-red-900 text-red-400">Trash</Button>
                          )}
                          <Button onClick={() => setReleaseBuild({ projectId: project.id, buildId: build.id, target: build.specGroup })} disabled={busy || build.state !== 'APPROVED'} variant="outline" className="h-8 border-violet-900 text-violet-300">Prepare Release</Button>
                        </div>
                      );
                    })}
                  </div>
                  {releaseBuild?.projectId === project.id && <div className="mt-3"><ReleaseWizard projectId={releaseBuild.projectId} buildId={releaseBuild.buildId} defaultTarget={releaseBuild.target} /></div>}
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
              onChange={(e) => setCatalogFilter(e.target.value as 'ALL' | CatalogLifecycleStatus)}
              className="rounded-lg border border-[#343d4b] bg-[#0d1015] px-3 py-2 text-sm text-[#e8edf6] focus:outline-none focus:border-[#9f8557]"
            >
              <option value="ALL">All statuses</option>
              <option value="ENABLED">Enabled only</option>
              <option value="OFFLINE">Offline only</option>
              <option value="TRASHED">Trash only</option>
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
                          <span className={`rounded px-2 py-0.5 ${status === 'ENABLED' ? 'bg-emerald-500/20 text-emerald-300' : status === 'TRASHED' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right space-x-2">
                          <Button
                            onClick={() => setCatalogStatus(entry.id, 'ENABLED')}
                            disabled={!canRun || rowBusy || status === 'ENABLED' || status === 'TRASHED'}
                            variant="outline"
                            className="h-8 border-[#345045] text-[#ccf2de] hover:bg-[#20382f]"
                          >
                            Enable
                          </Button>
                          <Button
                            onClick={() => setCatalogStatus(entry.id, 'OFFLINE')}
                            disabled={!canRun || rowBusy || status === 'OFFLINE' || status === 'TRASHED'}
                            variant="outline"
                            className="h-8 border-[#5a4631] text-[#f5dfc2] hover:bg-[#3a2c1f]"
                          >
                            Set Offline
                          </Button>
                          {status === 'TRASHED' ? (
                            <Button onClick={() => changeCatalogLifecycle(entry.id, 'RESTORE')} disabled={!canRun || rowBusy} variant="outline" className="h-8 border-amber-800 text-amber-300">Restore</Button>
                          ) : (
                            <Button onClick={() => changeCatalogLifecycle(entry.id, 'TRASH')} disabled={!canRun || rowBusy || !canTrashCatalog(status)} variant="outline" className="h-8 border-red-900 text-red-300">Trash</Button>
                          )}
                          <Button
                            onClick={() => deleteZpkEntry(entry.id, status)}
                            disabled={!canRun || rowBusy || !canRestoreCatalog(status)}
                            variant="outline"
                            title={status !== 'TRASHED' ? 'Move to Trash before permanent deletion' : 'Delete permanently'}
                            className="h-8 border-red-900 text-red-400 hover:bg-red-950 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete Permanently
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

      {storeArchitectureFlags.productHierarchy && <details className="rounded-2xl border border-[#343946] bg-[#0d1117] p-6 space-y-3">
        <summary className="cursor-pointer text-sm font-semibold text-[#9ba6b8]">Legacy tools — one-time recovery and diagnostics only</summary>
        <h2 className="pt-3 text-lg font-semibold text-[#e9edf5]">Legacy Migration</h2>
        <p className="text-sm text-[#9ba6b8]">Creates one temporary Design Model and SKU per legacy face. It never guesses colors, editions, or artistic families, and never modifies legacy orders or binaries.</p>
        <div className="flex flex-wrap gap-2"><Button onClick={runMigrationDryRun} disabled={!canRun || migrationBusy} variant="outline">Run Dry-Run</Button><Button onClick={loadMigrationQueue} disabled={!canRun || migrationBusy} variant="outline">Load Classification Queue</Button>{migrationReport && <Button onClick={applyMigration} disabled={migrationBusy || migrationReport.storage.missingZpkIds.length > 0} className="bg-violet-700 text-white">Apply Saved Plan</Button>}</div>
        <div className="flex flex-wrap gap-2"><Button onClick={() => runZpkAudit(true)} disabled={!canRun || migrationBusy} variant="outline">Start Read-Only ZPK Audit</Button>{zpkAudit.length > 0 && zpkAuditCursor && <Button onClick={() => runZpkAudit(false)} disabled={migrationBusy} variant="outline">Audit Next 5</Button>}</div>
        {zpkAudit.length > 0 && <div className="max-h-72 overflow-auto rounded-lg border border-[#303744] text-xs">{zpkAudit.map((entry) => <div key={entry.id} className="border-b border-[#252d38] p-3"><p className="text-white">{entry.id} · {entry.verdict}</p><p className="font-mono text-[10px] text-[#738095]">{entry.specGroup} · {entry.outerConfigVersion ?? '?'} / {entry.deviceConfigVersion ?? '?'}</p>{entry.reason && <p className="break-all text-amber-300">{entry.reason}</p>}</div>)}</div>}
        {migrationReport && <div className="rounded-lg border border-[#303744] p-3 text-xs text-[#aeb9c9] space-y-1">
          <p>{migrationReport.legacyCount} legacy records · {migrationReport.enabledCount} visible · {migrationReport.offlineOrTrashedCount} retained offline</p>
          <p>{migrationReport.orderCount} orders · {migrationReport.tokenCount} tokens · {migrationReport.mappedOrderProductCount} mapped legacy products</p>
          <p>{formatStorageBytes(migrationReport.storage.managedBytes)} managed · {migrationReport.storage.orphanObjectCount} unexplained objects · {migrationReport.storage.missingZpkIds.length} missing ZPK files</p>
          <p className="font-mono text-[10px] text-[#738095]">Plan {migrationReport.planHash}</p>
          {migrationReport.unknownOrderProductIds.length > 0 && <div className="rounded border border-amber-900/70 bg-amber-950/20 p-2 text-amber-200">
            <p className="font-semibold">Historical order product IDs requiring compatibility review</p>
            <p className="mt-1 break-all font-mono text-[10px]">{migrationReport.unknownOrderProductIds.join(', ')}</p>
          </div>}
          {migrationReport.conflicts.length > 0 && <div className="rounded border border-red-900/70 bg-red-950/20 p-2 text-red-200">
            <p className="font-semibold">Migration conflicts</p>
            {migrationReport.conflicts.map((conflict) => <p key={`${conflict.legacyWatchfaceId}:${conflict.reason}`} className="break-all font-mono text-[10px]">{conflict.legacyWatchfaceId}: {conflict.reason}</p>)}
          </div>}
          {migrationReport.storage.missingZpkIds.length > 0 && <p className="text-red-300">Apply blocked: missing ZPKs for {migrationReport.storage.missingZpkIds.join(', ')}</p>}
        </div>}
        {migrationQueue.length > 0 && <div className="max-h-56 overflow-auto rounded-lg border border-[#303744] text-xs">{migrationQueue.map((entry) => <div key={entry.id} className="border-b border-[#252d38] p-3"><p className="text-white">{entry.legacyWatchfaceId} · {entry.status}</p><p className="text-[10px] text-[#738095]">Needs: {entry.requiredFields.join(', ')}</p>{entry.warnings.length > 0 && <p className="text-amber-300">{entry.warnings.join(', ')}</p>}</div>)}</div>}
      </details>}

      <div className="rounded-2xl border border-[#2f3642] bg-[#11151b] p-6 space-y-3">
        <h2 className="text-lg font-semibold text-[#e9edf5]">Storage Maintenance</h2>
        <p className="text-sm text-[#9ba6b8]">Dry-run scan across current and historical managed paths. It reports possible orphans and never deletes automatically.</p>
        <Button onClick={runStorageMaintenance} disabled={!canRun || loadingMaintenance} variant="outline" className="border-[#3b4d68] text-[#ecf2ff]">{loadingMaintenance ? 'Scanning...' : 'Scan Storage Usage'}</Button>
        {maintenanceReport && (
          <div className="text-xs text-[#aeb9c9] space-y-1">
            <p>{maintenanceReport.managedObjects} managed objects · {formatStorageBytes(maintenanceReport.totalBytes)}</p>
            <p>{maintenanceReport.orphanCandidates.length} possible orphans · {formatStorageBytes(maintenanceReport.orphanBytes)}</p>
            <div className="max-h-36 overflow-auto font-mono text-[10px] text-[#738095]">{maintenanceReport.orphanCandidates.map((item) => <div key={item.path}>{item.path} · {formatStorageBytes(item.bytes)}</div>)}</div>
          </div>
        )}
      </div>

      {canRun && (
        <AdminPanel />
      )}
    </section>
  );
}
