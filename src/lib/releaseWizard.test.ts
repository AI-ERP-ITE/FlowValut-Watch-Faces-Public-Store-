import { describe, expect, it } from 'vitest';
import { findNormalizedConflict, nextRevision, releaseWizardPreview } from './releaseWizard';

describe('release wizard authority', () => {
  it('detects normalized duplicates', () => expect(findNormalizedConflict('Legacy: One', [{ id: '1', name: 'legacy one' }])?.id).toBe('1'));
  it('increments revisions', () => { expect(nextRevision([])).toBe('v1.0'); expect(nextRevision(['v1.0', 'v1.2'])).toBe('v1.3'); });
  it('generates canonical identities', () => {
    const result = releaseWizardPreview({ designDnaName: 'Heritage', designDnaCode: 'HER', collectionName: 'Legacy', collectionCode: 'LEG', modelName: 'Legacy 01', modelNumber: 1, variantName: 'Steel', variantCode: 'STL', editionName: 'Classic', editionCode: 'CLS', technicalTargetId: '480R', revision: 'v1.0', regularPrice: 8 });
    expect(result.canonicalName).toContain('FlowVault Legacy 01');
    expect(result.internalCode).toBe('FVL-LEG-001-STL-CLS-480R-v1.0');
    expect(result.ids).toEqual({
      designDnaId: 'heritage',
      collectionId: 'heritage-legacy',
      modelId: 'heritage-legacy-legacy-01',
      skuId: 'heritage-legacy-legacy-01-steel-classic',
    });
  });
});
