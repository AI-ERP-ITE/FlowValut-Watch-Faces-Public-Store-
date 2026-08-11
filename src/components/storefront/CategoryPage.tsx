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

  return <main className="maison-section">
    <Link to="/" className="maison-back-link">Browse /</Link>
    <div className="maison-section-heading"><div><p className="maison-eyebrow">Category</p><h1>{label}</h1></div><p>{models.length} timepiece{models.length === 1 ? '' : 's'}{selectedDevice ? ` for ${selectedDevice.name}` : ''}</p></div>
    {models.length ? <div className="maison-model-grid">{models.map((model) => <DesignModelCard key={model.id} model={model} store={data} />)}</div> : <div className="maison-empty-state"><h2>{selectedDevice ? `Coming soon for ${selectedDevice.name}` : `No ${label} timepieces yet`}</h2><p>Choose another category or select All Watches.</p></div>}
  </main>;
}

function Status({ text }: { text: string }) { return <div className="maison-status">{text}</div>; }
