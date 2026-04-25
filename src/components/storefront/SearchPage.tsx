import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useCatalog, type SortOption } from '@/context/CatalogContext';
import { WatchfaceGrid } from './WatchfaceGrid';
import { SortControls } from './SortControls';
import { EmptyState } from './EmptyState';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { catalog, baseUrl, loading, error } = useCatalog();

  const query = searchParams.get('q') ?? '';
  const [sortBy, setSortBy] = useState<SortOption>('latest');

  // Keep page title in sync with query
  useEffect(() => {
    document.title = query ? `"${query}" — Flowvault` : 'Search — Flowvault';
    return () => { document.title = 'Flowvault'; };
  }, [query]);

  // Filter: match query terms against name + hashtags (AND logic)
  const results = useMemo(() => {
    if (!query.trim()) return [];

    const terms = query.trim().toLowerCase().split(/\s+/);

    let filtered = catalog.filter((entry) => {
      const searchable = [
        entry.name.toLowerCase(),
        ...entry.hashtags.map((h) => h.toLowerCase()),
        ...entry.categories.map((c) => c.toLowerCase()),
      ].join(' ');
      return terms.every((term) => searchable.includes(term));
    });

    // Sort
    switch (sortBy) {
      case 'most-downloaded':
        filtered = filtered.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'price-asc':
        filtered = filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered = filtered.sort((a, b) => b.price - a.price);
        break;
      case 'free-only':
        filtered = filtered.filter((e) => e.price === 0).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'paid-only':
        filtered = filtered.filter((e) => e.price > 0).sort((a, b) => a.price - b.price);
        break;
      default: // latest
        filtered = filtered.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    return filtered;
  }, [catalog, query, sortBy]);

  // Suggested tags from non-empty catalog (top 10 most common hashtags)
  const suggestedTags = useMemo(() => {
    const freq: Record<string, number> = {};
    catalog.forEach((e) => e.hashtags.forEach((h) => { freq[h] = (freq[h] ?? 0) + 1; }));
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  }, [catalog]);

  return (
    <div className="min-h-screen vault-shell">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <nav className="text-xs text-[#8E9196] mb-3 flex items-center gap-1.5 font-mono">
            <Link to="/" className="hover:text-[#E1E4EA] transition-colors">Browse</Link>
            <span>/</span>
            <span className="text-[#E1E4EA]">Search</span>
          </nav>

          {query ? (
            <div className="flex items-end gap-3 flex-wrap">
              <h1 className="text-2xl font-light text-[#E1E4EA]">
                Results for{' '}
                <span className="vault-gold-text">&ldquo;{query}&rdquo;</span>
              </h1>
              <Link
                to="/"
                className="text-xs text-[#8E9196] hover:text-[#E1E4EA] transition-colors mb-0.5"
              >
                Clear search
              </Link>
            </div>
          ) : (
            <h1 className="text-2xl font-light text-[#E1E4EA]">Search</h1>
          )}
        </div>

        {/* Loading / error */}
        {loading && (
          <p className="text-sm text-[#8E9196]">Loading…</p>
        )}
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {/* No query state */}
        {!loading && !error && !query && (
          <div className="space-y-4">
            <p className="text-sm text-[#8E9196]">
              Type in the search bar above to find watchfaces by name, hashtag, or style.
            </p>
            {suggestedTags.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest text-[#8E9196] mb-2 font-mono">
                  Popular tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSearchParams({ q: tag })}
                      className="px-2.5 py-1 rounded-full text-xs bg-[#131821] border border-[#2f3743] text-[#8E9196] hover:text-[#E8D2A8] hover:border-[#C7A86F]/45 transition-colors"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {!loading && !error && query && (
          <div className="space-y-4">
            <SortControls value={sortBy} onChange={setSortBy} count={results.length} />
            {results.length > 0 ? (
              <WatchfaceGrid entries={results} baseUrl={baseUrl} />
            ) : (
              <EmptyState subtitle={`No watchfaces match “${query}” — try a different search.`} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
