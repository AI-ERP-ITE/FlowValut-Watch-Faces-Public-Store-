import { ArrowLeft, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStoreReadModel } from '@/context/StoreReadModelContext';
import { compatibleModelIds, modelPrice } from '@/lib/storeReadModel';
import { DesignModelCard } from './DesignModelCard';

type DiscoverySort = 'latest' | 'most-downloaded' | 'price-asc' | 'price-desc' | 'free-only' | 'paid-only';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const { data, loading, error, globalDeviceId } = useStoreReadModel();
  const query = params.get('q')?.trim() ?? '';
  const [sort, setSort] = useState<DiscoverySort>('latest');

  useEffect(() => {
    document.title = query ? `“${query}” — FlowVault` : 'Search — FlowVault';
    return () => { document.title = 'FlowVault — Digital Timepieces'; };
  }, [query]);

  const tags = useMemo(() => {
    const frequency = new Map<string, number>();
    for (const model of data?.designModels ?? []) for (const tag of model.tags ?? []) frequency.set(tag, (frequency.get(tag) ?? 0) + 1);
    return [...frequency.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag]) => tag);
  }, [data]);

  const results = useMemo(() => {
    if (!data) return [];
    const allowed = compatibleModelIds(data, globalDeviceId);
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    let models = data.designModels.filter((model) => {
      if (!allowed.has(model.id)) return false;
      const searchable = [model.name, model.description, model.designStory, ...(model.tags ?? []), ...(model.categories ?? [])].filter(Boolean).join(' ').toLowerCase();
      return terms.every((term) => searchable.includes(term));
    });
    if (sort === 'free-only') models = models.filter((model) => modelPrice(data, model.id) === 0);
    if (sort === 'paid-only') models = models.filter((model) => (modelPrice(data, model.id) ?? 0) > 0);
    return [...models].sort((a, b) => {
      if (sort === 'most-downloaded') return (b.downloads ?? 0) - (a.downloads ?? 0);
      if (sort === 'price-asc') return (modelPrice(data, a.id) ?? Number.MAX_SAFE_INTEGER) - (modelPrice(data, b.id) ?? Number.MAX_SAFE_INTEGER);
      if (sort === 'price-desc') return (modelPrice(data, b.id) ?? -1) - (modelPrice(data, a.id) ?? -1);
      return (b.releasedAt ?? b.id).localeCompare(a.releasedAt ?? a.id);
    });
  }, [data, globalDeviceId, query, sort]);

  if (loading) return <Status text="Preparing search…" />;
  if (error || !data) return <Status text={error ?? 'Store unavailable'} />;
  const selectedDevice = data.devices.find((item) => item.id === globalDeviceId);

  return (
    <div className="maison-collection-page">
      <header className="maison-collection-hero">
        <div className="maison-collection-hero-shade" />
        <div className="maison-collection-hero-copy">
          <Link to="/" className="maison-back-link"><ArrowLeft size={14} /> Back to Browse</Link>
          <p className="maison-eyebrow">Discover Timepieces</p>
          <h1>{query ? `Results for “${query}”` : 'Search All Timepieces'}</h1>
          <p>{results.length} result{results.length === 1 ? '' : 's'}{selectedDevice ? ` compatible with ${selectedDevice.name}` : ''}. Filter by tag or sort options below.</p>
          <span>{results.length} Model{results.length === 1 ? '' : 's'}</span>
        </div>
      </header>

      <section className="maison-section">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-[#3a3528]/40 bg-[#12151c]/70">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-[#a09a8e] mr-2 flex items-center gap-1.5"><Search size={14} /> Popular Tags:</span>
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setParams({ q: tag })}
                className="text-xs px-3 py-1 rounded-full border border-[#3a3528]/40 bg-[#1f2633] text-[#e8d2a8] hover:border-[#e8d2a8]/60 transition-all cursor-pointer"
              >
                #{tag}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#a09a8e]">Sort by:</span>
            <select
              aria-label="Sort and filter results"
              value={sort}
              onChange={(event) => setSort(event.target.value as DiscoverySort)}
              className="rounded-lg border border-[#3a3528]/60 bg-[#090b0f] px-3 py-1.5 text-xs text-[#f4e8d1] focus:outline-none focus:border-[#e8d2a8]"
            >
              <option value="latest">Latest Releases</option>
              <option value="most-downloaded">Most Popular</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="free-only">Free Only</option>
              <option value="paid-only">Paid Only</option>
            </select>
          </div>
        </div>

        {results.length ? (
          <div className="maison-model-grid">
            {results.map((model) => <DesignModelCard key={model.id} model={model} store={data} />)}
          </div>
        ) : (
          <div className="maison-empty-state">
            <h2 className="text-xl text-[#f4e8d1] mb-2">{selectedDevice ? `Coming soon for ${selectedDevice.name}` : 'No matching timepieces'}</h2>
            <p className="text-xs text-[#a09a8e]">Try another search query or return to all collections.</p>
            <Link to="/" className="inline-block mt-4 text-xs text-[#e8d2a8] underline">Return to Collections</Link>
          </div>
        )}
      </section>
    </div>
  );
}

function Status({ text }: { text: string }) { return <div className="maison-status">{text}</div>; }
