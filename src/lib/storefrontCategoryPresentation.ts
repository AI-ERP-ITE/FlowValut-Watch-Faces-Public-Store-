import type { PublicDesignModel } from './storeReadModel';

export interface StorefrontCategoryLink {
  slug: string;
  label: string;
}

export interface StorefrontCategoryGroup {
  label: string;
  links: StorefrontCategoryLink[];
}

const CATEGORY_GROUPS = [
  {
    label: 'Character',
    categories: ['dark', 'gothic', 'luxury', 'ornamental', 'minimal', 'simple', 'elegant', 'artistic', 'sporty', 'funny'],
  },
  {
    label: 'Display',
    categories: ['analog', 'digital', 'hybrid'],
  },
  {
    label: 'Theme',
    categories: ['supernatural', 'mechanical', 'classic', 'futuristic'],
  },
  {
    label: 'Tier',
    categories: ['premium'],
  },
] as const;

export function storefrontCategorySlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
}

export function buildStorefrontCategoryGroups(models: PublicDesignModel[]): StorefrontCategoryGroup[] {
  const active = new Map<string, string>();
  models.forEach((model) => {
    model.categories.forEach((category) => {
      const label = category.trim();
      if (label) active.set(storefrontCategorySlug(label), label);
    });
  });

  const assigned = new Set<string>();
  const groups: StorefrontCategoryGroup[] = CATEGORY_GROUPS.map((group) => {
    const links = group.categories.flatMap((slug) => {
      if (!active.has(slug)) return [];
      assigned.add(slug);
      return [{ slug, label: slug.charAt(0).toUpperCase() + slug.slice(1) }];
    });
    return { label: group.label, links };
  }).filter((group) => group.links.length > 0);

  const remaining = Array.from(active.entries())
    .filter(([slug]) => !assigned.has(slug))
    .sort(([, left], [, right]) => left.localeCompare(right))
    .map(([slug, label]) => ({ slug, label }));

  if (remaining.length > 0) groups.push({ label: 'More', links: remaining });
  return groups;
}

export function collectionCategoryLabel(models: PublicDesignModel[]): string {
  return buildStorefrontCategoryGroups(models)[0]?.links[0]?.label ?? 'FlowVault';
}
