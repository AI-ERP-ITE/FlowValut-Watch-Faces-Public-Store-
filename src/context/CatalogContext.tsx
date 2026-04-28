import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { fetchCatalogFromFirebase } from '@/lib/studioFirebasePublishApi';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CatalogEntry {
  id: string;
  name: string;
  specGroup: string;
  categories: string[];
  hashtags: string[];
  basePrice?: number;
  discountPercent?: number;
  price: number;
  stripeLink: string | null;
  createdAt: string;
  downloads: number;
  zpkPath: string;
  previewPath: string;
  qrPath: string;
  sourcePath?: string;
  published?: boolean;
  storeStatus?: 'ENABLED' | 'OFFLINE';
}

export interface ModelEntry {
  name: string;
  brand: string;
  specGroup: string;
}

export interface SpecGroup {
  resolution: string;
  shape: 'round' | 'square';
  apiVersion: 'v2' | 'v3';
  deviceSources: number[];
}

interface SourceMetadata {
  specGroup?: string | null;
  resolution?: string;
  shape?: 'round' | 'square';
  watchModel?: string;
}

export type SortOption =
  | 'latest'
  | 'most-downloaded'
  | 'price-asc'
  | 'price-desc'
  | 'free-only'
  | 'paid-only';

export interface FilterState {
  brand: string | null;
  modelSlug: string | null;
  priceFilter: 'all' | 'free' | 'paid';
  sortBy: SortOption;
  searchQuery: string;
}

// ── Context ────────────────────────────────────────────────────────────────

interface CatalogContextValue {
  catalog: CatalogEntry[];
  models: Record<string, ModelEntry>;
  specGroups: Record<string, SpecGroup>;
  loading: boolean;
  error: string | null;
  /** Apply filters + sort + search and return matching entries */
  getFiltered: (overrides?: Partial<FilterState>) => CatalogEntry[];
  /** Given a model slug, return all compatible catalog entries */
  getByModel: (modelSlug: string) => CatalogEntry[];
  /** Given a category string, return matching catalog entries */
  getByCategory: (category: string) => CatalogEntry[];
  /** Given a watchface id, return its entry or null */
  getById: (id: string) => CatalogEntry | null;
  /** Given a specGroup key, return model slugs that use it */
  getModelsBySpecGroup: (specGroup: string) => string[];
  /** Base URL used to build asset URLs */
  baseUrl: string;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.BASE_URL; // e.g. '/Watch-Faces/'

function buildAssetUrl(relativePath: string): string {
  if (/^(https?:)?\/\//i.test(relativePath) || relativePath.startsWith('data:')) {
    return relativePath;
  }
  return `${BASE_URL}${relativePath}`;
}

function normalizeModelName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function inferSpecGroupFromSource(
  source: SourceMetadata,
  models: Record<string, ModelEntry>,
  specGroups: Record<string, SpecGroup>
): string | null {
  if (source.specGroup && specGroups[source.specGroup]) {
    return source.specGroup;
  }

  if (source.watchModel) {
    const sourceModel = normalizeModelName(source.watchModel);
    const matched = Object.values(models).find((model) => {
      const known = normalizeModelName(model.name);
      return known.includes(sourceModel) || sourceModel.includes(known);
    });
    if (matched?.specGroup) return matched.specGroup;
  }

  if (source.resolution && source.shape) {
    const candidates = Object.entries(specGroups)
      .filter(([, sg]) => sg.resolution === source.resolution && sg.shape === source.shape)
      .map(([key]) => key);
    if (candidates.length === 1) return candidates[0] ?? null;
  }

  return null;
}

function getSourcePathFromZpk(zpkPath: string): string | null {
  const match = zpkPath.match(/^zpk\/([^/]+)\/face\.zpk$/i);
  if (!match) return null;
  return `zpk/${match[1]}/source.json`;
}

async function hydrateCatalogSpecGroups(
  entries: CatalogEntry[],
  models: Record<string, ModelEntry>,
  specGroups: Record<string, SpecGroup>
): Promise<CatalogEntry[]> {
  const needsHydration = entries.filter(
    (entry) => !entry.specGroup || entry.specGroup === 'unknown' || !specGroups[entry.specGroup]
  );

  if (!needsHydration.length) return entries;

  const patched = new Map<string, string>();

  await Promise.all(
    needsHydration.map(async (entry) => {
      const sourcePath = getSourcePathFromZpk(entry.zpkPath);
      if (!sourcePath) return;

      try {
        const res = await fetch(buildAssetUrl(sourcePath));
        if (!res.ok) return;

        const source = (await res.json()) as SourceMetadata;
        const inferred = inferSpecGroupFromSource(source, models, specGroups);
        if (inferred) patched.set(entry.id, inferred);
      } catch {
        // Silent fallback — keep existing value if source.json is missing or invalid.
      }
    })
  );

  if (!patched.size) return entries;

  return entries.map((entry) => {
    const next = patched.get(entry.id);
    if (!next) return entry;
    return { ...entry, specGroup: next };
  });
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [models, setModels] = useState<Record<string, ModelEntry>>({});
  const [specGroups, setSpecGroups] = useState<Record<string, SpecGroup>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        let backendCatalogEntries: CatalogEntry[] = [];
        const backendBase =
          (import.meta.env.VITE_FIREBASE_FUNCTIONS_BASE_URL as string | undefined)?.trim() ||
          (import.meta.env.VITE_PURCHASE_FUNCTIONS_BASE_URL as string | undefined)?.trim() ||
          (import.meta.env.VITE_GITHUB_FUNCTIONS_BASE_URL as string | undefined)?.trim();

        if (backendBase) {
          try {
            backendCatalogEntries = await fetchCatalogFromFirebase();
          } catch {
            backendCatalogEntries = [];
          }
        }

        const [catalogRes, modelsRes, specGroupsRes] = await Promise.all([
          fetch(buildAssetUrl('catalog.json')),
          fetch(buildAssetUrl('models.json')),
          fetch(buildAssetUrl('specGroups.json')),
        ]);

        if (!catalogRes.ok) throw new Error('Failed to load catalog.json');
        if (!modelsRes.ok) throw new Error('Failed to load models.json');
        if (!specGroupsRes.ok) throw new Error('Failed to load specGroups.json');

        const [catalogData, modelsData, specGroupsData] = await Promise.all([
          catalogRes.json(),
          modelsRes.json(),
          specGroupsRes.json(),
        ]);

        const hydratedCatalog = await hydrateCatalogSpecGroups(
          (backendCatalogEntries.length > 0 ? backendCatalogEntries : (catalogData as CatalogEntry[])),
          modelsData as Record<string, ModelEntry>,
          specGroupsData as Record<string, SpecGroup>
        );

        setCatalog(hydratedCatalog);
        setModels(modelsData);
        setSpecGroups(specGroupsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error loading catalog');
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getById = useMemo(
    () => (id: string) => catalog.find((e) => e.id === id) ?? null,
    [catalog]
  );

  const getModelsBySpecGroup = useMemo(
    () => (specGroup: string) =>
      Object.entries(models)
        .filter(([, m]) => m.specGroup === specGroup)
        .map(([slug]) => slug),
    [models]
  );

  const getByModel = useMemo(
    () => (modelSlug: string) => {
      const model = models[modelSlug];
      if (!model) return [];
      return catalog.filter((e) => e.specGroup === model.specGroup);
    },
    [catalog, models]
  );

  const getByCategory = useMemo(
    () => (category: string) =>
      catalog.filter((e) =>
        e.categories.some((c) => c.toLowerCase() === category.toLowerCase())
      ),
    [catalog]
  );

  function applySort(entries: CatalogEntry[], sortBy: SortOption): CatalogEntry[] {
    const sorted = [...entries];
    switch (sortBy) {
      case 'latest':
        return sorted.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'most-downloaded':
        return sorted.sort((a, b) => b.downloads - a.downloads);
      case 'price-asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'free-only':
        return sorted.filter((e) => e.price === 0).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'paid-only':
        return sorted.filter((e) => e.price > 0).sort((a, b) => a.price - b.price);
      default:
        return sorted;
    }
  }

  function getFiltered(overrides?: Partial<FilterState>): CatalogEntry[] {
    const {
      brand = null,
      modelSlug = null,
      priceFilter = 'all',
      sortBy = 'latest',
      searchQuery = '',
    }: Partial<FilterState> = overrides ?? {};

    let results = [...catalog];

    // Filter by model slug (resolves to specGroup)
    if (modelSlug) {
      const model = models[modelSlug];
      if (model) results = results.filter((e) => e.specGroup === model.specGroup);
    }

    // Filter by brand (all models of that brand → their specGroups)
    if (brand && !modelSlug) {
      const brandSpecGroups = new Set(
        Object.values(models)
          .filter((m) => m.brand.toLowerCase() === brand.toLowerCase())
          .map((m) => m.specGroup)
      );
      results = results.filter((e) => brandSpecGroups.has(e.specGroup));
    }

    // Filter by price
    if (priceFilter === 'free') results = results.filter((e) => e.price === 0);
    if (priceFilter === 'paid') results = results.filter((e) => e.price > 0);

    // Filter by search query (hashtags + name)
    if (searchQuery.trim()) {
      const terms = searchQuery
        .toLowerCase()
        .split(/[\s,]+/)
        .filter(Boolean);
      results = results.filter((e) => {
        const haystack = [
          e.name.toLowerCase(),
          ...e.hashtags.map((h) => h.toLowerCase()),
          ...e.categories.map((c) => c.toLowerCase()),
        ];
        return terms.every((term) => haystack.some((h) => h.includes(term)));
      });
    }

    return applySort(results, sortBy);
  }

  const value: CatalogContextValue = {
    catalog,
    models,
    specGroups,
    loading,
    error,
    getFiltered,
    getByModel,
    getByCategory,
    getById,
    getModelsBySpecGroup,
    baseUrl: BASE_URL,
  };

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return ctx;
}
