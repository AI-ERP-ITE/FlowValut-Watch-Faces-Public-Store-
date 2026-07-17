export type CatalogLifecycleStatus = 'ENABLED' | 'OFFLINE' | 'TRASHED';

export function permanentDeleteConfirmation(watchfaceId: string): string {
  return `DELETE ${watchfaceId}`;
}

export function canTrashCatalog(status: CatalogLifecycleStatus): boolean {
  return status === 'OFFLINE';
}

export function canRestoreCatalog(status: CatalogLifecycleStatus): boolean {
  return status === 'TRASHED';
}

export function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** unit)).toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}
