import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { modelSkus, skuOffer, skuPackages, type PublicDesignModel, type StoreReadModel } from '@/lib/storeReadModel';

export function DesignModelCard({ model, store }: { model: PublicDesignModel; store: StoreReadModel }) {
  const skus = modelSkus(store, model.id);
  const firstSku = skus[0];
  const offer = firstSku ? skuOffer(store, firstSku.id) : null;
  const previewPath = firstSku
    ? skuPackages(store, firstSku.id).find((item) => item.mainPreviewPath)?.mainPreviewPath
    : null;
  const preview = previewPath && !/^(https?:)?\/\//i.test(previewPath) && !previewPath.startsWith('/')
    ? `${import.meta.env.BASE_URL}${previewPath}`
    : previewPath;
  const collection = store.collections.find((item) => item.id === model.collectionId);

  return (
    <Link to={`/design/${model.slug || model.id}`} className="maison-model-card">
      <div className="maison-model-media">
        {preview ? (
          <img src={preview} alt={`${model.name} digital timepiece`} loading="lazy" />
        ) : (
          <div className="maison-image-fallback" />
        )}
        <span className="maison-card-collection">{collection?.name ?? 'FlowVault'}</span>
      </div>
      <div className="maison-model-copy">
        <div>
          <h3>{model.name}</h3>
          <p>{skus.length} color / edition option{skus.length === 1 ? '' : 's'}</p>
        </div>
        {skus.length > 1 && (
          <div className="maison-card-variants" aria-label={`${model.name} variants`}>
            {skus.slice(0, 4).map((item) => {
              const itemPath = skuPackages(store, item.id).find((pkg) => pkg.mainPreviewPath)?.mainPreviewPath;
              const itemPreview = itemPath && !/^(https?:)?\/\//i.test(itemPath) && !itemPath.startsWith('/')
                ? `${import.meta.env.BASE_URL}${itemPath}`
                : itemPath;
              return (
                <span key={item.id} title={`${item.variant.name}${item.edition?.name ? ` · ${item.edition.name}` : ''}`}>
                  {itemPreview ? <img src={itemPreview} alt="" loading="lazy" /> : <i style={{ background: item.variant.swatch || '#28231c' }} />}
                </span>
              );
            })}
            {skus.length > 4 && <small>+{skus.length - 4}</small>}
          </div>
        )}
        <div className="maison-model-meta">
          <span>{offer ? `From $${(offer.campaignPrice ?? offer.regularPrice).toFixed(2)}` : 'Discover'}</span>
          <span>Discover <ArrowRight size={14} /></span>
        </div>
      </div>
    </Link>
  );
}
