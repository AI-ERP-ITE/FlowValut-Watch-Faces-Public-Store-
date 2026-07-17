import { describe, expect, it } from 'vitest';
import {
  adaptLegacyCatalogEntry,
  adaptLegacyDeviceCatalog,
  buildCanonicalCustomerName,
  buildInternalProductCode,
  buildReleaseStoragePaths,
  buildWorkshopStoragePaths,
  canonicalSlug,
  normalizeIdentity,
  offerSchema,
  resolveStoreArchitectureFlags,
  workshopBuildSchema,
} from './storeArchitecture';

describe('store architecture identity helpers', () => {
  it('normalizes case, accents, punctuation, and spacing for duplicate checks', () => {
    expect(normalizeIdentity('  Món-Arch  01 ')).toBe('mon arch 01');
    expect(normalizeIdentity('MON ARCH 01')).toBe('mon arch 01');
    expect(canonicalSlug('Royal Blue')).toBe('royal-blue');
  });

  it('builds canonical customer names from optional hierarchy parts', () => {
    expect(buildCanonicalCustomerName({ modelName: 'Monarch 01', variantName: 'Royal Blue', editionName: 'Vital Edition' }))
      .toBe('FlowVault Monarch 01 — Royal Blue — Vital Edition');
    expect(buildCanonicalCustomerName({ modelName: 'Monarch 01' }))
      .toBe('FlowVault Monarch 01');
  });

  it('builds the permanent internal product code', () => {
    expect(buildInternalProductCode({
      collectionCode: 'MN',
      modelNumber: 1,
      variantCode: 'RB',
      editionCode: 'VT',
      technicalTargetCode: '480R',
      revision: 'v1.0',
    })).toBe('FVL-MN-001-RB-VT-480R-v1.0');
  });
});

describe('store architecture validation', () => {
  it('requires a previous state for trashed Workshop builds', () => {
    const result = workshopBuildSchema.safeParse({
      id: 'build-1',
      projectId: 'project-1',
      buildNumber: 1,
      workshopLabel: 'Test 1',
      state: 'TRASHED',
      fvwfPath: 'workshop/project-1/builds/0001/project.fvwf',
      zpkPath: 'workshop/project-1/builds/0001/test.zpk',
      resolution: { width: 480, height: 480 },
      hashes: {},
      storageBytes: 10,
      createdAt: '2026-07-17T00:00:00.000Z',
      createdBy: 'admin-1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid Offer pricing and multi-SKU individual Offers', () => {
    expect(offerSchema.safeParse({
      id: 'bad-offer',
      type: 'SKU',
      name: 'Bad',
      includedSkuIds: ['one', 'two'],
      regularPrice: 8,
      campaignPrice: 12,
      currency: 'USD',
      state: 'ACTIVE',
    }).success).toBe(false);
  });
});

describe('store architecture paths and flags', () => {
  it('builds deterministic Workshop and release paths', () => {
    expect(buildWorkshopStoragePaths('legacy-project', 4)).toEqual({
      root: 'workshop/legacy-project/builds/0004',
      fvwf: 'workshop/legacy-project/builds/0004/project.fvwf',
      zpk: 'workshop/legacy-project/builds/0004/test.zpk',
      mainPreview: 'workshop/legacy-project/builds/0004/preview-main.png',
      aodPreview: 'workshop/legacy-project/builds/0004/preview-aod.png',
    });
    expect(buildReleaseStoragePaths('monarch-01-rb-vital', 'target-480r', 'v1.1').zpk)
      .toBe('releases/monarch-01-rb-vital/target-480r/v1.1/face.zpk');
  });

  it('keeps every new architecture feature disabled by default', () => {
    expect(resolveStoreArchitectureFlags({})).toEqual({
      workshop: false,
      productHierarchy: false,
      releaseRepack: false,
      storefrontReadModel: false,
      offerCheckout: false,
    });
    expect(resolveStoreArchitectureFlags({ VITE_STORE_WORKSHOP_ENABLED: 'true' }).workshop).toBe(true);
  });
});

describe('legacy compatibility adapters', () => {
  it('treats models.json entries as physical Devices', () => {
    expect(adaptLegacyDeviceCatalog({
      'balance-2': { name: 'Amazfit Balance 2', brand: 'amazfit', specGroup: '480-round-v2' },
    })).toEqual([{
      id: 'balance-2',
      name: 'Amazfit Balance 2',
      brand: 'amazfit',
      technicalTargetId: '480-round-v2',
      legacyModelSlug: 'balance-2',
    }]);
  });

  it('maps one legacy catalog entry to one temporary model, SKU, package, Offer, and mapping', () => {
    const result = adaptLegacyCatalogEntry({
      id: 'fleming-orange',
      name: 'Fleming Orange',
      specGroup: '480-round-v2',
      categories: ['premium'],
      hashtags: ['analog'],
      basePrice: 8,
      discountPercent: 50,
      price: 4,
      createdAt: '2026-04-25T18:14:03.567Z',
      zpkPath: 'zpk/fleming-orange.zpk',
    });

    expect(result.productModel.state).toBe('DRAFT');
    expect(result.offer).toMatchObject({ regularPrice: 8, campaignPrice: 4, state: 'DRAFT' });
    expect(result.mapping).toMatchObject({ legacyWatchfaceId: 'fleming-orange', migrationState: 'TEMPORARY' });
    expect(result.technicalPackage.releasedZpkPath).toBe('zpk/fleming-orange.zpk');
  });
});
