import { adminFetch } from './studioFirebasePublishApi';
import type { ReleaseWizardDraft } from './releaseWizard';

export interface HierarchyOption { id: string; name: string; code?: string; parentId?: string; modelNumber?: number }
export interface SkuHierarchyOption extends HierarchyOption { productModelId: string; variantName: string; variantCode: string; editionName?: string; editionCode?: string; state?: string }
export interface TechnicalPackageOption { id: string; skuId: string; technicalTargetId: string; revision: string; state: string; approvedWorkshopProjectId?: string; approvedWorkshopBuildId?: string }
export interface HierarchySnapshot { designDnas: HierarchyOption[]; collections: HierarchyOption[]; productModels: HierarchyOption[]; skus: SkuHierarchyOption[]; technicalTargets: HierarchyOption[]; technicalPackages: TechnicalPackageOption[]; offers: HierarchyOption[] }

export async function fetchStoreHierarchy(): Promise<HierarchySnapshot> {
  const result = await adminFetch<HierarchySnapshot>('adminStoreHierarchy', { method: 'GET' });
  return {
    designDnas: result.designDnas || [],
    collections: result.collections || [],
    productModels: result.productModels || [],
    skus: result.skus || [],
    technicalTargets: result.technicalTargets || [],
    technicalPackages: result.technicalPackages || [],
    offers: result.offers || [],
  };
}

export async function submitReleaseClassification(input: ReleaseWizardDraft & { projectId: string; buildId: string; action: 'READY' | 'RELEASE' }) {
  return adminFetch<{ packageId: string; canonicalName: string; internalCode: string; packageState: 'READY' | 'VALIDATING' | 'CURRENT'; conflicts: string[]; resumed?: boolean }>('adminStoreHierarchy', { method: 'POST', body: JSON.stringify(input) });
}

export async function releaseVerifiedPackage(packageId: string) {
  return adminFetch<{ canonicalName: string; releasedZpkPath: string; parityReportPath: string; hashes: { approved: string; released: string } }>('adminReleasePackage', { method: 'POST', body: JSON.stringify({ packageId }) });
}
