import type { CatalogEntry } from '@/context/CatalogContext';

const HERO_CONFIG_KEY = 'storefront.heroConfig.v1';

export interface StorefrontHeroConfig {
  featuredFaceId: string | null;
}

const DEFAULT_CONFIG: StorefrontHeroConfig = {
  featuredFaceId: null,
};

export function readHeroConfig(): StorefrontHeroConfig {
  try {
    const raw = localStorage.getItem(HERO_CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;

    const parsed = JSON.parse(raw) as Partial<StorefrontHeroConfig>;
    return {
      featuredFaceId: typeof parsed.featuredFaceId === 'string' ? parsed.featuredFaceId : null,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveHeroConfig(config: StorefrontHeroConfig): void {
  localStorage.setItem(HERO_CONFIG_KEY, JSON.stringify(config));
}

export function resolveFeaturedFace(
  catalog: CatalogEntry[],
  config: StorefrontHeroConfig
): CatalogEntry | null {
  if (!catalog.length) return null;

  if (config.featuredFaceId) {
    const exact = catalog.find((entry) => entry.id === config.featuredFaceId);
    if (exact) return exact;
  }

  return catalog[0] ?? null;
}
