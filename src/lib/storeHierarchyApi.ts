import { adminFetch } from './studioFirebasePublishApi';
import type { ReleaseWizardDraft } from './releaseWizard';

export interface HierarchyOption {
  id: string; name: string; code?: string; parentId?: string; modelNumber?: number;
  description?: string; designStory?: string; categories?: string[]; tags?: string[];
  type?: 'SKU' | 'BUNDLE'; includedSkuIds?: string[]; regularPrice?: number; campaignPrice?: number | null;
  commercialCheckoutReady?: boolean;
  paddle?: PaddleCatalogMappings;
}
export type PaddleCatalogSyncStatus = 'NOT_SYNCED' | 'SYNCING' | 'SYNCED' | 'OUT_OF_SYNC' | 'ERROR' | 'ARCHIVED';
export interface PaddleCatalogMapping { environment?: 'sandbox' | 'production'; productId?: string; priceId?: string; standardPriceId?: string; promotionalPriceId?: string; activePriceId?: string; syncStatus?: PaddleCatalogSyncStatus; syncError?: { code: string; message: string; retryable: boolean } | null; lastSyncHash?: string; lastSyncedAt?: unknown; lastReconciledAt?: unknown }
export interface PaddleCatalogMappings { sandbox?: PaddleCatalogMapping; production?: PaddleCatalogMapping }
export interface PaddleCatalogStatusResponse { offerId: string; environment: 'sandbox'; mapping: PaddleCatalogMapping; desiredSyncHash: string }
export interface PaddleCatalogBatchResult { offerId: string; action?: 'CREATE' | 'RECONCILE'; status?: PaddleCatalogSyncStatus; productId?: string | null; activePriceId?: string; code?: string; retryable?: boolean }
export interface PaddleCatalogBatchResponse { environment: 'sandbox'; action: 'DRY_RUN' | 'BULK_SYNC'; results: PaddleCatalogBatchResult[]; nextCursor: string | null }
export interface SkuHierarchyOption extends HierarchyOption { productModelId: string; variantName: string; variantCode: string; editionName?: string; editionCode?: string; state?: string }
export interface TechnicalPackageOption { id: string; skuId: string; offerId?: string; technicalTargetId: string; revision: string; state: string; approvedWorkshopProjectId?: string; approvedWorkshopBuildId?: string }
export interface HierarchySnapshot { designDnas: HierarchyOption[]; collections: HierarchyOption[]; productModels: HierarchyOption[]; skus: SkuHierarchyOption[]; technicalTargets: HierarchyOption[]; technicalPackages: TechnicalPackageOption[]; offers: HierarchyOption[] }
export interface DownloadMetricRow { packageId: string; skuId: string; modelId: string; name: string; successfulTransfers: number; uniqueFulfilledOrders: number }

export async function fetchDownloadMetrics() {
  return adminFetch<{ rows: DownloadMetricRow[] }>('adminDownloadMetrics', { method: 'GET' });
}

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

export async function submitReleaseClassification(input: ReleaseWizardDraft & {
  projectId: string;
  buildId: string;
  action: 'READY' | 'RELEASE';
  selectedDesignDnaId?: string;
  selectedCollectionId?: string;
  selectedProductModelId?: string;
  selectedSkuId?: string;
}) {
  return adminFetch<{ packageId: string; canonicalName: string; internalCode: string; packageState: 'READY' | 'VALIDATING' | 'CURRENT'; conflicts: string[]; resumed?: boolean }>('adminStoreHierarchy', { method: 'POST', body: JSON.stringify(input) });
}

export async function releaseVerifiedPackage(packageId: string) {
  return adminFetch<{
    offerId: string;
    catalogSyncRequired: boolean;
    catalogSync: { environment: 'sandbox'; status: 'SYNCED' | 'ERROR' | 'DEFERRED' | 'NOT_REQUIRED'; productId?: string | null; activePriceId?: string | null; code?: string; retryable?: boolean };
    canonicalName: string;
    releasedZpkPath: string;
    parityReportPath: string;
    hashes: { approved: string; released: string };
  }>('adminReleasePackage', { method: 'POST', body: JSON.stringify({ packageId }) });
}

export async function syncPaddleCatalogOffer(offerId: string) {
  return adminFetch<{ offerId: string; environment: 'sandbox'; mapping: PaddleCatalogMapping }>('adminPaddleCatalog', {
    method: 'POST',
    body: JSON.stringify({ action: 'SYNC', environment: 'sandbox', offerId }),
  });
}

export async function getPaddleCatalogStatus(offerId: string) {
  return adminFetch<PaddleCatalogStatusResponse>('adminPaddleCatalog', { method: 'POST', body: JSON.stringify({ action: 'STATUS', environment: 'sandbox', offerId }) });
}

export async function reconcilePaddleCatalogOffer(offerId: string) {
  return adminFetch<{ offerId: string; environment: 'sandbox'; result: string; productId: string | null; desiredSyncHash: string }>('adminPaddleCatalog', {
    method: 'POST', body: JSON.stringify({ action: 'RECONCILE', environment: 'sandbox', offerId }),
  });
}

export async function archivePaddleCatalogOffer(offerId: string) {
  return adminFetch<{ offerId: string; environment: 'sandbox'; mapping: PaddleCatalogMapping }>('adminPaddleCatalog', {
    method: 'POST', body: JSON.stringify({ action: 'ARCHIVE', environment: 'sandbox', offerId, confirmation: `ARCHIVE ${offerId}` }),
  });
}

export async function runPaddleCatalogBatch(action: 'DRY_RUN' | 'BULK_SYNC', cursor?: string, limit = 10) {
  return adminFetch<PaddleCatalogBatchResponse>('adminPaddleCatalog', {
    method: 'POST', body: JSON.stringify({ action, environment: 'sandbox', cursor, limit }),
  });
}

export async function deleteAbandonedTechnicalPackage(packageId: string) {
  return adminFetch<{ ok: true; packageId: string }>('adminStoreHierarchy', {
    method: 'DELETE',
    body: JSON.stringify({ packageId, confirmation: `DELETE ${packageId}` }),
  });
}
