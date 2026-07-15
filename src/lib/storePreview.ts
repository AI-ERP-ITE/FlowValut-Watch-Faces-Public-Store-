import type { CatalogEntry } from '@/context/CatalogContext';

export function getStorePreviewPaths(entry: Pick<CatalogEntry, 'previewPath' | 'aodPreviewPath'>) {
  return {
    main: entry.previewPath,
    aod: entry.aodPreviewPath || entry.previewPath,
  };
}
