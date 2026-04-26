import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCatalog, type FilterState, type SortOption } from '@/context/CatalogContext';
import { FilterSidebar } from './FilterSidebar';
import { SortControls } from './SortControls';
import { WatchfaceGrid } from './WatchfaceGrid';
import { EmptyState } from './EmptyState';

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

  const [heroModelSlug, setHeroModelSlug] = useState<string>('all');
  const [heroCategory, setHeroCategory] = useState<string>('all');
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroNow, setHeroNow] = useState(() => new Date());

  const heroCategories = useMemo(() => {
    const set = new Set<string>();
    results.forEach((entry) => {
      entry.categories.forEach((cat) => set.add(cat.toLowerCase()));
    });
    return ['all', ...Array.from(set).sort()];
  }, [results]);

  const heroCandidates = useMemo(() => {
    let source = results;

    if (heroModelSlug !== 'all') {
      const model = models[heroModelSlug];
      if (!model) return [];
      source = source.filter((entry) => entry.specGroup === model.specGroup);
    }

    if (heroCategory !== 'all') {
      source = source.filter((entry) =>
        entry.categories.some((cat) => cat.toLowerCase() === heroCategory)
      );
    }

    return source;
  }, [results, heroModelSlug, heroCategory, models]);

  const featuredFace = heroCandidates[heroIndex] ?? null;

  useEffect(() => {
    setHeroIndex((prev) => {
      if (heroCandidates.length === 0) return 0;
      return prev >= heroCandidates.length ? 0 : prev;
    });
  }, [heroCandidates.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroNow(new Date());
    }, 30_000);

    return () => clearInterval(timer);
  }, []);

  const heroTime = useMemo(
    () =>
      heroNow.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    [heroNow]
  );

  const heroDay = useMemo(
    () => heroNow.toLocaleDateString([], { weekday: 'long' }),
    [heroNow]
  );

  const heroStyleLabel = heroCategory === 'all' ? 'All' : capitalize(heroCategory);

  function cycleHeroFace() {
    if (heroCandidates.length === 0) return;
    setHeroIndex((prev) => (prev + 1) % heroCandidates.length);
  }

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
              <button
                type="button"
                onClick={cycleHeroFace}
                className="vault-glass rounded-xl px-3 py-2 text-left hover:border-[#C7A86F]/45 transition-colors"
                title="Click to cycle featured watchface"
              >
                <p className="vault-micro">Faces</p>
                <p className="text-[#E8D2A8] text-lg font-medium">{heroCandidates.length}</p>
                <p className="text-[10px] text-[#8E9196] mt-0.5">click next</p>
              </button>
              <div className="vault-glass rounded-xl px-3 py-2 text-left">
                <p className="vault-micro">Models</p>
                <select
                  value={heroModelSlug}
                  onChange={(e) => {
                    setHeroModelSlug(e.target.value);
                    setHeroIndex(0);
                  }}
                  className="mt-1 w-full bg-transparent text-[#E8D2A8] text-sm font-medium focus:outline-none"
                >
                  <option value="all" className="bg-[#121418] text-[#E8D2A8]">All ({modelList.length})</option>
                  {modelList.map(([slug, model]) => (
                    <option key={slug} value={slug} className="bg-[#121418] text-[#E8D2A8]">
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="vault-glass rounded-xl px-3 py-2 text-left">
                <p className="vault-micro">Style</p>
                <select
                  value={heroCategory}
                  onChange={(e) => {
                    setHeroCategory(e.target.value);
                    setHeroIndex(0);
                  }}
                  className="mt-1 w-full bg-transparent text-[#E8D2A8] text-sm font-medium focus:outline-none"
                >
                  {heroCategories.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#121418] text-[#E8D2A8]">
                      {cat === 'all' ? 'All' : capitalize(cat)}
                    </option>
                  ))}
                </select>
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
                    className="absolute inset-0 w-full h-full object-cover opacity-35"
                  />
                )}
                <div className="text-center">
                  <div className="text-5xl font-extralight tracking-[0.08em] text-[#f7f8fa]">{heroTime}</div>
                  <div className="vault-micro mt-2">{heroDay}</div>
                  <p className="mt-3 text-xs text-[#E8D2A8] max-w-[220px] truncate">
                    {featuredFace?.name ?? 'No watchface for current selection'}
                  </p>
                  <p className="text-[10px] text-[#9ca3af] mt-1">Style: {heroStyleLabel}</p>
                </div>
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#E8D2A8]" />
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-[#2a313e] overflow-hidden">
                  <div className="w-3/4 h-full bg-[#D4B57D]" />
                </div>
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

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
