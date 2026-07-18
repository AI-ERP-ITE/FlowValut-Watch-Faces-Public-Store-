import { adminFetch } from '@/lib/studioFirebasePublishApi';

export interface LegacyMigrationReport {
  reportId: string; planHash: string; legacyCount: number; enabledCount: number; offlineOrTrashedCount: number;
  orderCount: number; tokenCount: number; mappedOrderProductCount: number; unknownOrderProductIds: string[];
  conflicts: Array<{ legacyWatchfaceId: string; reason: string }>;
  storage: { managedObjectCount: number; managedBytes: number; orphanObjectCount: number; orphanBytes: number; orphanObjects: Array<{ path: string; bytes: number }>; missingZpkIds: string[] };
  requiredConfirmation: string;
}

export interface LegacyClassificationEntry { id: string; legacyWatchfaceId: string; productModelId: string; skuId: string; technicalPackageId: string; status: 'PENDING' | 'CLASSIFIED' | 'CONSOLIDATED'; requiredFields: string[]; warnings: string[] }
export interface LegacyZpkAuditEntry { id: string; zpkPath: string; specGroup: string; verdict: 'COMPATIBLE' | 'INCOMPATIBLE' | 'UNKNOWN_TARGET' | 'MISSING_ZPK'; reason?: string; outerConfigVersion?: string; deviceConfigVersion?: string }

export function dryRunLegacyMigration() { return adminFetch<LegacyMigrationReport>('adminLegacyMigration', { method: 'POST', body: JSON.stringify({ action: 'DRY_RUN' }) }); }
export function applyLegacyMigration(reportId: string, confirmation: string) { return adminFetch<{ ok: boolean; migrated: number; queueEntries: number; legacyOrdersUntouched: boolean; legacyTokensUntouched: boolean }>('adminLegacyMigration', { method: 'POST', body: JSON.stringify({ action: 'APPLY', reportId, confirmation }) }); }
export function fetchLegacyClassificationQueue() { return adminFetch<{ entries: LegacyClassificationEntry[] }>('adminLegacyMigration', { method: 'GET' }).then((result) => result.entries); }
export function auditLegacyZpkPage(cursor?: string) { return adminFetch<{ readOnly: true; results: LegacyZpkAuditEntry[]; nextCursor: string | null }>('adminLegacyMigration', { method: 'POST', body: JSON.stringify({ action: 'AUDIT_ZPK', limit: 5, ...(cursor ? { cursor } : {}) }) }); }
