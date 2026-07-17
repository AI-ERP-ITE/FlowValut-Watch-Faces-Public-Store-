import { adminFetch } from './studioFirebasePublishApi';
import type { ReleaseWizardDraft } from './releaseWizard';

export interface HierarchyOption { id: string; name: string; code?: string; parentId?: string }
export interface HierarchySnapshot { designDnas: HierarchyOption[]; collections: HierarchyOption[]; productModels: HierarchyOption[]; technicalTargets: HierarchyOption[]; offers: HierarchyOption[] }

export async function fetchStoreHierarchy(): Promise<HierarchySnapshot> {
  return adminFetch<HierarchySnapshot>('adminStoreHierarchy', { method: 'GET' });
}

export async function submitReleaseClassification(input: ReleaseWizardDraft & { projectId: string; buildId: string; action: 'READY' | 'RELEASE' }) {
  return adminFetch<{ canonicalName: string; internalCode: string; packageState: 'READY' | 'VALIDATING'; conflicts: string[] }>('adminStoreHierarchy', { method: 'POST', body: JSON.stringify(input) });
}
