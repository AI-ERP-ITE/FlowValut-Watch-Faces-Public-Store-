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

  return <main className="maison-section">
    <Link to="/" className="maison-back-link">Browse /</Link>
    <div className="maison-section-heading"><div><p className="maison-eyebrow">Discover</p><h1>{query ? `Results for “${query}”` : 'Search all timepieces'}</h1></div><p>{results.length} result{results.length === 1 ? '' : 's'}{selectedDevice ? ` for ${selectedDevice.name}` : ''}</p></div>
    <div className="mb-6 flex flex-wrap gap-3">
      <select aria-label="Sort and filter results" value={sort} onChange={(event) => setSort(event.target.value as DiscoverySort)} className="rounded-lg border border-[#343b48] bg-[#11151d] p-3 text-white">
        <option value="latest">Latest</option><option value="most-downloaded">Most downloaded</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="free-only">Free only</option><option value="paid-only">Paid only</option>
      </select>
      {tags.map((tag) => <button key={tag} type="button" onClick={() => setParams({ q: tag })} className="rounded-full border border-[#343b48] px-3 text-[#c8b58e]">#{tag}</button>)}
    </div>
    {results.length ? <div className="maison-model-grid">{results.map((model) => <DesignModelCard key={model.id} model={model} store={data} />)}</div> : <div className="maison-empty-state"><h2>{selectedDevice ? `Coming soon for ${selectedDevice.name}` : 'No matching timepieces'}</h2><p>Try another search or choose All Watches.</p></div>}
  </main>;
}

function Status({ text }: { text: string }) { return <div className="maison-status">{text}</div>; }
