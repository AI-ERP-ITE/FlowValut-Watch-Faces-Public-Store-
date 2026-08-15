import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStoreReadModel } from '@/context/StoreReadModelContext';
import { CollectionEditorialCard } from './DesignModelHomePage';

export function CollectionsIndexPage() {
  const { data, loading, error } = useStoreReadModel();

  if (loading) return <div className="min-h-screen bg-[#090b0f] text-[#e8d2a8] grid place-items-center">Loading Collections…</div>;
  if (error || !data) return <div className="min-h-screen bg-[#090b0f] text-[#e8d2a8] grid place-items-center">{error ?? 'Store unavailable'}</div>;

  return (
    <div className="maison-collection-page">
      <header className="maison-collection-hero">
        <div className="maison-collection-hero-shade" />
        <div className="maison-collection-hero-copy">
          <Link to="/" className="maison-back-link"><ArrowLeft size={14} /> Back to Browse</Link>
          <p className="maison-eyebrow">FlowVault Collections</p>
          <h1>Design DNA & Families</h1>
          <p>Distinct design families, each governed by its own proportion, atmosphere, and character.</p>
          <span>{data.collections.length} Collections</span>
        </div>
      </header>

      <section className="maison-section">
        <div className="maison-collection-grid">
          {data.collections.map((collection, index) => (
            <CollectionEditorialCard
              key={collection.id}
              collection={collection}
              store={data}
              allowedModelIds={new Set(data.designModels.map((model) => model.id))}
              index={index}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
