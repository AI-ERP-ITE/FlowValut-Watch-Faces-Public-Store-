import { Link } from 'react-router-dom';
import { useStoreReadModel } from '@/context/StoreReadModelContext';
import { DesignModelCard } from './DesignModelCard';

export function DesignModelHomePage() {
  const { data, loading, error } = useStoreReadModel();
  if (loading) return <Status text="Loading the collection…" />; if (error || !data) return <Status text={error ?? 'Store unavailable'} />;
  return <main className="min-h-screen vault-shell"><section className="vault-page-hero border-b border-[#20252f] px-6 py-16"><div className="mx-auto max-w-6xl"><p className="vault-micro">FlowVault finished timepieces</p><h1 className="mt-3 text-4xl font-light text-[#e7e9ee]">Design Models</h1><p className="mt-3 max-w-2xl text-[#9ca5b3]">Each model is one complete watch design. Choose its color, material, and widget edition inside the model page; watch compatibility does not create duplicate products.</p><div className="mt-6 flex gap-3 text-sm"><span className="rounded border border-[#343b48] px-3 py-2 text-[#e8d2a8]">{data.metrics.uniqueDesignModels} Unique Models</span><span className="rounded border border-[#343b48] px-3 py-2 text-[#e8d2a8]">{data.metrics.sellableSkus} Sellable SKUs</span></div></div></section><section className="mx-auto max-w-6xl px-4 py-10"><div className="mb-8 flex flex-wrap gap-2">{data.collections.map((item) => <Link key={item.id} to={`/collection/${item.slug || item.id}`} className="rounded-full border border-[#343b48] px-3 py-1.5 text-sm text-[#c9ced7] hover:border-[#c7a86f]">{item.name}</Link>)}</div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.designModels.map((model) => <DesignModelCard key={model.id} model={model} store={data} />)}</div></section></main>;
}
function Status({ text }: { text: string }) { return <div className="min-h-screen grid place-items-center text-sm text-[#8e96a3]">{text}</div>; }
