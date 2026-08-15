import { useState } from 'react';
import { ArrowRight, Download } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { modelSkus, skuOffer, skuPackages, type PublicDesignModel, type StoreReadModel } from '@/lib/storeReadModel';

export function DesignModelCard({ model, store }: { model: PublicDesignModel; store: StoreReadModel }) {
  const navigate = useNavigate();
  const skus = modelSkus(store, model.id);
  const firstSku = skus[0];
  const [activeSkuId, setActiveSkuId] = useState<string | null>(firstSku?.id ?? null);

  const activeSku = skus.find((s) => s.id === activeSkuId) ?? firstSku;
  const offer = activeSku ? skuOffer(store, activeSku.id) : null;
  const previewPath = activeSku
    ? skuPackages(store, activeSku.id).find((item) => item.mainPreviewPath)?.mainPreviewPath
    : null;
  const preview = previewPath && !/^(https?:)?\/\//i.test(previewPath) && !previewPath.startsWith('/')
    ? `${import.meta.env.BASE_URL}${previewPath}`
    : previewPath;
  const collection = store.collections.find((item) => item.id === model.collectionId);

  const handleCardClick = (e: React.MouseEvent) => {
    // If target is interactive swatch, don't trigger main card link
    if ((e.target as HTMLElement).closest('.maison-variant-swatch-btn')) {
      e.preventDefault();
    }
  };

  return (
    <Link to={`/design/${model.slug || model.id}`} onClick={handleCardClick} className="maison-model-card group">
      <div className="maison-model-media flex items-center justify-center p-4">
        {preview ? (
          <img
            src={preview}
            alt={`${model.name} digital timepiece`}
            loading="lazy"
            className="max-w-[260px] max-h-[260px] object-contain transition-transform duration-300 group-hover:scale-105"
          />
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
            {skus.slice(0, 5).map((item) => {
              const itemPath = skuPackages(store, item.id).find((pkg) => pkg.mainPreviewPath)?.mainPreviewPath;
              const itemPreview = itemPath && !/^(https?:)?\/\//i.test(itemPath) && !itemPath.startsWith('/')
                ? `${import.meta.env.BASE_URL}${itemPath}`
                : itemPath;
              const isActive = (activeSku?.id ?? firstSku?.id) === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveSkuId(item.id)}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveSkuId(item.id);
                    navigate(`/design/${model.slug || model.id}?sku=${item.id}`);
                  }}
                  className={`maison-variant-swatch-btn inline-block rounded-full p-0.5 border transition-all cursor-pointer ${
                    isActive ? 'border-[#e8d2a8] scale-110' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  title={`${item.variant.name}${item.edition?.name ? ` · ${item.edition.name}` : ''}`}
                >
                  <span className="w-5 h-5 block rounded-full overflow-hidden">
                    {itemPreview ? <img src={itemPreview} alt="" loading="lazy" className="w-full h-full object-cover" /> : <i style={{ background: item.variant.swatch || '#28231c' }} className="w-full h-full block" />}
                  </span>
                </button>
              );
            })}
            {skus.length > 5 && <small>+{skus.length - 5}</small>}
          </div>
        )}
        <div className="maison-model-meta">
          <span>{offer ? `From $${(offer.campaignPrice ?? offer.regularPrice).toFixed(2)}` : 'Discover'}</span>
          <span><Download size={12} /> {(model.downloads ?? 0).toLocaleString()} downloads</span>
          <span>Discover <ArrowRight size={14} /></span>
        </div>
      </div>
    </Link>
  );
}

export function DesignModelRowCard({ model, store }: { model: PublicDesignModel; store: StoreReadModel }) {
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
    <Link to={`/design/${model.slug || model.id}`} className="flex items-center gap-6 p-4 rounded-xl border border-[#3a3528]/40 bg-[#12151c]/80 hover:border-[#e8d2a8]/60 hover:bg-[#1a202c] transition-all group">
      <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center p-1 rounded-lg bg-[#090b0f]">
        {preview ? <img src={preview} alt={model.name} loading="lazy" className="w-full h-full object-contain group-hover:scale-105 transition-transform" /> : <div className="w-full h-full bg-[#1e2330] rounded" />}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-mono text-[#e8d2a8] uppercase tracking-widest">{collection?.name ?? 'FlowVault'}</span>
        <h3 className="text-lg font-serif text-[#f4e8d1] group-hover:text-[#e8d2a8] transition-colors truncate">{model.name}</h3>
        <p className="text-xs text-[#a09a8e] truncate">{model.description || model.designStory || `${skus.length} edition options`}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <span className="text-sm font-semibold text-[#e8d2a8] block">{offer ? `$${(offer.campaignPrice ?? offer.regularPrice).toFixed(2)}` : 'Discover'}</span>
        <span className="text-xs text-[#a09a8e] flex items-center justify-end gap-1 group-hover:translate-x-1 transition-transform">Explore <ArrowRight size={13} /></span>
      </div>
    </Link>
  );
}
