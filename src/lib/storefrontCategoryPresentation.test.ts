import { describe, expect, it } from 'vitest';
import type { PublicDesignModel } from './storeReadModel';
import { buildStorefrontCategoryGroups, collectionCategoryLabel, storefrontCategorySlug } from './storefrontCategoryPresentation';

function model(categories: string[]): PublicDesignModel {
  return { id: crypto.randomUUID(), collectionId: 'collection', name: 'Model', slug: 'model', categories, tags: [] };
}

describe('storefront category presentation', () => {
  it('keeps every active category while applying the controlled group order', () => {
    const groups = buildStorefrontCategoryGroups([
      model(['Premium', 'Analog', 'Dark']),
      model(['Custom Character', 'dark']),
    ]);

    expect(groups.map((group) => group.label)).toEqual(['Character', 'Display', 'Tier', 'More']);
    expect(groups.flatMap((group) => group.links.map((link) => link.label))).toEqual([
      'Dark',
      'Analog',
      'Premium',
      'Custom Character',
    ]);
  });

  it('uses assigned metadata for collection captions and a neutral fallback', () => {
    expect(collectionCategoryLabel([model(['Premium', 'Gothic'])])).toBe('Gothic');
    expect(collectionCategoryLabel([model([])])).toBe('FlowVault');
  });

  it('creates stable URL slugs for multi-word categories', () => {
    expect(storefrontCategorySlug('Dark Luxury')).toBe('dark-luxury');
  });
});
