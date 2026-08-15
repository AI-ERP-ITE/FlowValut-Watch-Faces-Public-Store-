import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStoreReadModel } from '@/context/StoreReadModelContext';
import { compatibleModelIds } from '@/lib/storeReadModel';
import { DesignModelCard } from './DesignModelCard';
import { storefrontCategorySlug } from '@/lib/storefrontCategoryPresentation';

export function CategoryPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data, loading, error, globalDeviceId } = useStoreReadModel();
  const decodedSlug = storefrontCategorySlug(decodeURIComponent(slug));
  const models = useMemo(() => {
    if (!data) return [];
    const compatible = compatibleModelIds(data, globalDeviceId);
    return data.designModels.filter((model) => compatible.has(model.id) && [...(model.categories ?? []), ...(model.tags ?? [])].some((value) => storefrontCategorySlug(value) === decodedSlug));
  }, [data, decodedSlug, globalDeviceId]);

  if (loading) return <Status text="Preparing category…" />;
  if (error || !data) return <Status text={error ?? 'Store unavailable'} />;
  const label = decodedSlug.replace(/(^|[ -])\p{L}/gu, (letter) => letter.toUpperCase()).replace(/-/g, ' ');
  const selectedDevice = data.devices.find((device) => device.id === globalDeviceId);

  return (
    <div className="maison-collection-page">
      <header className="maison-collection-hero">
        <div className="maison-collection-hero-shade" />
        <div className="maison-collection-hero-copy">
          <Link to="/" className="maison-back-link"><ArrowLeft size={14} /> Back to Browse</Link>
          <p className="maison-eyebrow">Category Collection</p>
          <h1>{label}</h1>
          <p>{models.length} finished timepiece{models.length === 1 ? '' : 's'}{selectedDevice ? ` compatible with ${selectedDevice.name}` : ''}. Designed for performance, clarity, and everyday intelligence.</p>
          <span>{models.length} Model{models.length === 1 ? '' : 's'}</span>
        </div>
      </header>

      <section className="maison-section">
        {models.length ? (
          <div className="maison-model-grid">
            {models.map((model) => <DesignModelCard key={model.id} model={model} store={data} />)}
          </div>
        ) : (
          <div className="maison-empty-state">
            <h2 className="text-xl text-[#f4e8d1] mb-2">{selectedDevice ? `Coming soon for ${selectedDevice.name}` : `No ${label} timepieces yet`}</h2>
            <p className="text-xs text-[#a09a8e]">Choose another category or select All Watches.</p>
            <Link to="/" className="inline-block mt-4 text-xs text-[#e8d2a8] underline">Return to Collections</Link>
          </div>
        )}
      </section>
    </div>
  );
}

function Status({ text }: { text: string }) { return <div className="maison-status">{text}</div>; }
