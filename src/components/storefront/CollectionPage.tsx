import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useStoreReadModel } from '@/context/StoreReadModelContext';
import { modelSkus, skuPackages } from '@/lib/storeReadModel';
import { DesignModelCard } from './DesignModelCard';

export function CollectionPage() {
  const { slug } = useParams();
  const { data, loading, error, globalDeviceId } = useStoreReadModel();

  if (loading) return <Status text="Preparing the collection…" />;
  if (error || !data) return <Status text={error ?? 'Store unavailable'} />;

  const collection = data.collections.find((item) => item.slug === slug || item.id === slug);
  if (!collection) return <Status text="Collection not found." />;

  let models = data.designModels.filter((item) => item.collectionId === collection.id);
  if (globalDeviceId) {
    const device = data.devices.find((item) => item.id === globalDeviceId);
    if (device) {
      const compatibleSkus = new Set(data.technicalPackages
        .filter((item) => item.technicalTargetId === device.technicalTargetId)
        .map((item) => item.skuId));
      models = models.filter((model) => modelSkus(data, model.id).some((sku) => compatibleSkus.has(sku.id)));
    }
  }

  const leadModel = models[0];
  const leadSku = leadModel ? modelSkus(data, leadModel.id)[0] : null;
  const leadPath = leadSku ? skuPackages(data, leadSku.id).find((item) => item.mainPreviewPath)?.mainPreviewPath : null;
  const leadImage = assetUrl(leadPath);

  return (
    <div className="maison-collection-page">
      <header className="maison-collection-hero">
        {leadImage && <img src={leadImage} alt="" aria-hidden="true" />}
        <div className="maison-collection-hero-shade" />
        <div className="maison-collection-hero-copy">
          <Link to="/#collections" className="maison-back-link"><ArrowLeft size={14} /> Collections</Link>
          <p className="maison-eyebrow">FlowVault Collection</p>
          <h1>{collection.name}</h1>
          <p>{collection.description || 'A permanent design family of finished digital timepieces, united by a singular visual character.'}</p>
          <span>{models.length} Design Model{models.length === 1 ? '' : 's'}</span>
        </div>
      </header>

      <section className="maison-section">
        <div className="maison-section-heading">
          <div><p className="maison-eyebrow">The Collection</p><h2>Discover the Models</h2></div>
          <p>{globalDeviceId ? 'Showing designs compatible with your selected watch.' : 'Choose a model, then explore its available colors and editions.'}</p>
        </div>
        {models.length > 0 ? (
          <div className="maison-model-grid">
            {models.map((model) => <DesignModelCard key={model.id} model={model} store={data} />)}
          </div>
        ) : (
          <div className="maison-empty-state">No compatible models are currently available for the selected watch.</div>
        )}
      </section>
    </div>
  );
}

function assetUrl(path?: string | null): string | null {
  if (!path) return null;
  return /^(https?:)?\/\//i.test(path) || path.startsWith('/') ? path : `${import.meta.env.BASE_URL}${path}`;
}

function Status({ text }: { text: string }) {
  return <div className="maison-status">{text}</div>;
}
