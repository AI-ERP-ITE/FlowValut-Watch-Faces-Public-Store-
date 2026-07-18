import { describe, expect, it } from 'vitest';
import { compatibleDevices, modelSkus, resolveLegacyDesignModel, resolveLegacySku, skuOffer, type StoreReadModel } from './storeReadModel';

const fixture: StoreReadModel = { collections: [{ id: 'c', name: 'Legacy', slug: 'legacy' }], designModels: [{ id: 'm', collectionId: 'c', name: 'Legacy 01', slug: 'legacy-01', categories: [], tags: [] }], skus: [{ id: 's1', productModelId: 'm', canonicalName: 'Steel', variant: { id: 'steel', name: 'Steel', code: 'STL' } }, { id: 's2', productModelId: 'm', canonicalName: 'Gold', variant: { id: 'gold', name: 'Gold', code: 'GLD' } }], technicalPackages: [{ id: 'p', skuId: 's1', technicalTargetId: '480r', revision: 'v1.0', releasedZpkPath: 'x', canonicalName: 'Steel' }], offers: [{ id: 'o', type: 'SKU', name: 'Steel', includedSkuIds: ['s1'], regularPrice: 8, campaignPrice: 4, currency: 'USD' }], technicalTargets: [], devices: [{ id: 'balance', name: 'Balance', brand: 'Amazfit', technicalTargetId: '480r' }], legacyMappings: [{ legacyWatchfaceId: 'old', productModelId: 'm', skuId: 's1' }], metrics: { uniqueDesignModels: 1, sellableSkus: 2 } };

describe('public store read model', () => {
  it('keeps one model with multiple sellable SKUs', () => { expect(fixture.designModels).toHaveLength(1); expect(modelSkus(fixture, 'm')).toHaveLength(2); });
  it('resolves offer and compatible devices by selected SKU', () => { expect(skuOffer(fixture, 's1')?.campaignPrice).toBe(4); expect(compatibleDevices(fixture, 's1')[0].id).toBe('balance'); });
  it('resolves legacy face IDs to a Design Model', () => expect(resolveLegacyDesignModel(fixture, 'old')?.id).toBe('m'));
  it('resolves legacy buy IDs to the compatibility SKU', () => expect(resolveLegacySku(fixture, 'old')?.id).toBe('s1'));
});
