import { describe, expect, it } from 'vitest';
import { canRestoreCatalog, canTrashCatalog, formatStorageBytes, permanentDeleteConfirmation } from './catalogLifecycle';

describe('catalog lifecycle safety', () => {
  it('allows trash only after Take Offline', () => {
    expect(canTrashCatalog('ENABLED')).toBe(false);
    expect(canTrashCatalog('OFFLINE')).toBe(true);
    expect(canTrashCatalog('TRASHED')).toBe(false);
  });

  it('allows restore only from Trash', () => {
    expect(canRestoreCatalog('TRASHED')).toBe(true);
    expect(canRestoreCatalog('OFFLINE')).toBe(false);
  });

  it('builds an item-specific typed confirmation', () => {
    expect(permanentDeleteConfirmation('legacy-001')).toBe('DELETE legacy-001');
  });

  it('formats maintenance storage totals', () => {
    expect(formatStorageBytes(0)).toBe('0 B');
    expect(formatStorageBytes(1536)).toBe('1.5 KB');
  });
});
