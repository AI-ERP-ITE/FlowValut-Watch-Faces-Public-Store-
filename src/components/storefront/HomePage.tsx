import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCatalog, type FilterState, type SortOption } from '@/context/CatalogContext';
import { FilterSidebar } from './FilterSidebar';
import { SortControls } from './SortControls';
import { WatchfaceGrid } from './WatchfaceGrid';
import { EmptyState } from './EmptyState';
import { readHeroConfig, resolveFeaturedFace } from './heroConfig';

// ── Category metadata ──────────────────────────────────────────────────────

const CATEGORIES = [
  { slug: 'minimal',  label: 'Minimal',  emoji: '◻' },
  { slug: 'sporty',   label: 'Sporty',   emoji: '⚡' },
  { slug: 'elegant',  label: 'Elegant',  emoji: '✦' },
  { slug: 'digital',  label: 'Digital',  emoji: '▦' },
  { slug: 'analog',   label: 'Analog',   emoji: '◷' },
  { slug: 'funny',    label: 'Funny',    emoji: '★' },
];

// ── Component ──────────────────────────────────────────────────────────────

export function HomePage() {
  const { models, loading, error, getFiltered, baseUrl } = useCatalog();
  const [searchParams] = useSearchParams();

  // Seed from URL if coming from SearchBar
  const urlQuery = searchParams.get('q') ?? '';

  const [filters, setFilters] = useState<FilterState>({
    brand: null,
    modelSlug: null,
    priceFilter: 'all',
    sortBy: 'latest',
    searchQuery: urlQuery,
  });

  function updateFilter(partial: Partial<FilterState>) {
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  const results = useMemo(() => getFiltered(filters), [getFiltered, filters]);
  const hasFaces = results.length > 0;

  function clearFilters() {
    updateFilter({ brand: null, modelSlug: null, priceFilter: 'all', searchQuery: '' });
  }

  // ── Model chip list ──────────────────────────────────────────────────────
  const modelList = useMemo(() => Object.entries(models), [models]);

  const hasActiveFilters =
    filters.brand !== null ||
    filters.modelSlug !== null ||
    filters.priceFilter !== 'all' ||
    filters.searchQuery !== '';

  const featuredFace = useMemo(() => {
    if (typeof window === 'undefined') return results[0] ?? null;
    return resolveFeaturedFace(results, readHeroConfig());
  }, [results]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen vault-shell">
      {/* Hero — always visible */}
      <section
        className="vault-page-hero py-20 md:py-24 px-6 border-b border-[#20252f]"
      >
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div className="text-center lg:text-left">
            <p className="vault-micro mb-4">Premium Collection</p>
            <h1 className="font-sans font-light text-5xl md:text-6xl tracking-tight text-[#E1E4EA] mb-4">
              Flowvault
            </h1>
            <p className="font-sans text-lg text-[#A0A6B2] mb-2">
              Premium Watchfaces for Amazfit
            </p>
            <p className="font-mono text-sm text-[#8B93A0] max-w-sm mx-auto lg:mx-0">
              Designed for clarity, performance, and style.
            </p>
            <div className="mt-7 grid grid-cols-3 gap-2 max-w-sm mx-auto lg:mx-0">
              <div className="vault-glass rounded-xl px-3 py-2 text-left">
                <p className="vault-micro">Faces</p>
                <p className="text-[#E8D2A8] text-lg font-medium">{results.length}</p>
              </div>
              <div className="vault-glass rounded-xl px-3 py-2 text-left">
                <p className="vault-micro">Models</p>
                <p className="text-[#E8D2A8] text-lg font-medium">{modelList.length}</p>
              </div>
              <div className="vault-glass rounded-xl px-3 py-2 text-left">
                <p className="vault-micro">Style</p>
                <p className="text-[#E8D2A8] text-lg font-medium capitalize">
                  {featuredFace?.categories[0] ?? 'N/A'}
                </p>
              </div>
            </div>
          </div>
          <div className="hidden lg:flex items-center justify-center">
            <div className="store-hero-watch">
              <div className="store-hero-watch-inner">
                {featuredFace?.previewPath && (
                  <img
                    src={`${baseUrl}${featuredFace.previewPath}`}
                    alt={`${featuredFace.name} preview`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                {!featuredFace?.previewPath && (
                  <div className="w-24 h-24 rounded-full border-2 border-[#465064] flex items-center justify-center">
                    <span className="text-[#7f8794] text-4xl">⌚</span>
                  </div>
                )}
                {featuredFace?.previewPath && (
                  <div className="absolute inset-0 ring-1 ring-white/10 pointer-events-none" />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 font-mono text-sm text-[#8E9196]">Loading…</div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-16 text-red-400 font-mono text-sm">{error}</div>
      )}

      {/* Empty state — no faces */}
      {!loading && !error && !hasFaces && (
        <div className="max-w-xl mx-auto px-4 py-8">
          <EmptyState
            showClearFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
        </div>
      )}

      {/* Content — only when faces exist */}
      {!loading && !error && hasFaces && (
        <>
          {/* Model chips */}
          <section className="border-b border-[#20252f] px-4 py-4 overflow-x-auto">
            <div className="flex gap-2 w-max mx-auto">
              <ModelChip
                label="All Models"
                active={filters.modelSlug === null && filters.brand === null}
                onClick={() => updateFilter({ modelSlug: null, brand: null })}
              />
              {modelList.map(([slug, model]) => (
                <ModelChip
                  key={slug}
                  label={model.name}
                  active={filters.modelSlug === slug}
                  onClick={() =>
                    updateFilter({
                      modelSlug: filters.modelSlug === slug ? null : slug,
                      brand: null,
                    })
                  }
                />
              ))}
            </div>
          </section>

          {/* Category cards */}
          <section className="px-6 py-7 border-b border-[#20252f]">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 max-w-4xl mx-auto">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/category/${cat.slug}`}
                  className="vault-panel flex flex-col items-center gap-1.5 py-3 hover:border-[#C7A86F]/45 transition-colors group"
                >
                  <span className="text-lg text-[#8E9196] group-hover:text-[#C7A86F] transition-colors">{cat.emoji}</span>
                  <span className="text-xs font-sans text-[#8E9196] group-hover:text-[#E8D2A8] transition-colors">{cat.label}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Main: sidebar + grid */}
          <section className="max-w-7xl mx-auto px-4 py-8 flex gap-8">
            {/* Sidebar */}
            <aside className="hidden lg:block w-52 shrink-0">
              <FilterSidebar filters={filters} onChange={updateFilter} />
            </aside>

            {/* Right: sort + grid */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Mobile filter row */}
              <div className="lg:hidden">
                <MobileFilterRow filters={filters} onChange={updateFilter} />
              </div>

              <SortControls
                value={filters.sortBy}
                onChange={(v: SortOption) => updateFilter({ sortBy: v })}
                count={results.length}
              />

              <WatchfaceGrid entries={results} baseUrl={baseUrl} />
            </div>
          </section>
        </>
      )}

      {/* Placeholder so TS doesn't complain — never rendered */}
      {false && (
        <div>
          {loading && (
            <div className="text-center py-16 text-zinc-500 text-sm">Loading…</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ModelChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border
        ${active
          ? 'bg-[#F0DFC0] text-[#231b0e] border-[#F0DFC0]'
          : 'bg-[#121418] border-[#313843] text-[#9AA1AD] hover:bg-[#171a22] hover:text-[#E1E4EA] hover:border-[#4a5463]'
        }
      `}
    >
      {label}
    </button>
  );
}

function MobileFilterRow({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (p: Partial<FilterState>) => void;
}) {
  const { models } = useCatalog();
  const brands = useMemo(
    () => Array.from(new Set(Object.values(models).map((m) => m.brand))).sort(),
    [models]
  );

  return (
    <div className="flex gap-2 flex-wrap">
      {/* Brand select */}
      <select
        value={filters.brand ?? ''}
        onChange={(e) => onChange({ brand: e.target.value || null, modelSlug: null })}
        className="text-xs rounded-lg px-2.5 py-1.5 vault-input focus:outline-none"
      >
        <option value="">All Brands</option>
        {brands.map((b) => (
          <option key={b} value={b}>
            {b.charAt(0).toUpperCase() + b.slice(1)}
          </option>
        ))}
      </select>

      {/* Price select */}
      <select
        value={filters.priceFilter}
        onChange={(e) =>
          onChange({ priceFilter: e.target.value as FilterState['priceFilter'] })
        }
        className="text-xs rounded-lg px-2.5 py-1.5 vault-input focus:outline-none"
      >
        <option value="all">All Prices</option>
        <option value="free">Free</option>
        <option value="paid">Paid</option>
      </select>
    </div>
  );
}
