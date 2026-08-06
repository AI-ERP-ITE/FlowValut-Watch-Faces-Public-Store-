import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useStoreReadModel } from '@/context/StoreReadModelContext';
import {
  compatibleDevices,
  modelSkus,
  resolveLegacyDesignModel,
  skuOffers,
  skuPackages,
} from '@/lib/storeReadModel';
import { DesignModelCard } from './DesignModelCard';

export function DesignModelPage() {
  const { slug } = useParams();
  const { data, loading, error } = useStoreReadModel();
  const model = data?.designModels.find((item) => item.slug === slug || item.id === slug) ?? null;
  const skus = useMemo(() => data && model ? modelSkus(data, model.id) : [], [data, model]);
  const [skuId, setSkuId] = useState('');
  const [mode, setMode] = useState<'MAIN' | 'AOD'>('MAIN');

  if (loading) return <Status text="Preparing the timepiece…" />;
  if (error || !data) return <Status text={error ?? 'Store unavailable'} />;
  if (!model) return <Status text="Design model not found." />;

  const sku = skus.find((item) => item.id === skuId) ?? skus[0];
  if (!sku) return <Status text="No sellable edition is currently available." />;

  const offers = skuOffers(data, sku.id);
  const packages = skuPackages(data, sku.id);
  const media = packages.find((item) => item.mainPreviewPath || item.aodPreviewPath) ?? packages[0];
  const mainPreview = assetUrl(media?.mainPreviewPath);
  const aodPreview = assetUrl(media?.aodPreviewPath);
  const preview = mode === 'AOD' ? aodPreview : mainPreview;
  const devices = compatibleDevices(data, sku.id);
  const collection = data.collections.find((item) => item.id === model.collectionId);
  const relatedModels = data.designModels
    .filter((item) => item.collectionId === model.collectionId && item.id !== model.id)
    .slice(0, 3);

  return (
    <div className="maison-product-page">
      <div className="maison-product-breadcrumb">
        <Link to="/"><ArrowLeft size={14} /> Collections</Link>
        {collection && <><span>/</span><Link to={`/collection/${collection.slug || collection.id}`}>{collection.name}</Link></>}
        <span>/</span><span>{model.name}</span>
      </div>

      <section className="maison-product-intro">
        <div className="maison-product-gallery">
          <div className="maison-product-main-image">
            {preview ? <img src={preview} alt={`${sku.canonicalName} ${mode === 'AOD' ? 'always-on' : 'main'} preview`} /> : <div className="maison-image-fallback" />}
            <span>{mode === 'AOD' ? 'Always-On Display' : 'Main Display'}</span>
          </div>
          <div className="maison-preview-switch" aria-label="Preview mode">
            <button type="button" aria-pressed={mode === 'MAIN'} onClick={() => setMode('MAIN')}>
              {mainPreview && <img src={mainPreview} alt="" />}<span>Main</span>
            </button>
            <button type="button" aria-pressed={mode === 'AOD'} onClick={() => setMode('AOD')} disabled={!aodPreview}>
              {aodPreview && <img src={aodPreview} alt="" />}<span>AOD</span>
            </button>
          </div>
        </div>

        <aside className="maison-purchase-panel">
          <div>
            <p className="maison-eyebrow">{collection?.name ?? 'FlowVault'} Collection</p>
            <h1>{model.name}</h1>
            <p className="maison-variant-name">{sku.variant.name}{sku.edition?.name ? ` · ${sku.edition.name}` : ''}</p>
            <p className="maison-product-lede">{model.description || 'A finished digital timepiece composed for clarity, character, and everyday intelligence.'}</p>
          </div>

          <fieldset className="maison-variant-selector">
            <legend>Color / Material and Edition</legend>
            <div>
              {skus.map((item) => {
                const itemMedia = skuPackages(data, item.id).find((pkg) => pkg.mainPreviewPath);
                const itemPreview = assetUrl(itemMedia?.mainPreviewPath);
                const selected = sku.id === item.id;
                return (
                  <button key={item.id} type="button" onClick={() => { setSkuId(item.id); setMode('MAIN'); }} aria-pressed={selected}>
                    <span className="maison-variant-preview">
                      {itemPreview ? <img src={itemPreview} alt="" /> : <i style={{ background: item.variant.swatch || '#28231c' }} />}
                    </span>
                    <span><strong>{item.variant.name}</strong><small>{item.edition?.name || item.variant.material || 'Signature edition'}</small></span>
                    {selected && <Check size={15} />}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {offers.length > 0 && (
            <div className="maison-offer-list">
              {offers.map((offer) => (
                <div key={offer.id} className="maison-offer-card">
                  <div>
                    <p>{offer.type === 'BUNDLE' ? 'Complete Color Collection' : sku.canonicalName}</p>
                    {offer.campaignPrice != null && <span>${offer.regularPrice.toFixed(2)}</span>}
                  </div>
                  <strong>${(offer.campaignPrice ?? offer.regularPrice).toFixed(2)}</strong>
                  <Link to={`/buy/${offer.id}`} className="maison-button maison-button-primary">
                    {offer.type === 'BUNDLE' ? 'Choose Collection' : 'Acquire'} <ArrowRight size={16} />
                  </Link>
                </div>
              ))}
            </div>
          )}

          <p className="maison-purchase-note">Compatibility is confirmed for your selected watch before fulfillment.</p>
        </aside>
      </section>

      <section className="maison-product-story">
        <div>
          <p className="maison-eyebrow">Design Story</p>
          <h2>Composed, not decorated.</h2>
        </div>
        <p>{model.designStory || model.description || 'Every element is arranged as part of one coherent dial: hierarchy before novelty, proportion before ornament, and information shaped to feel natural at a glance.'}</p>
      </section>

      <section className="maison-product-information">
        <article>
          <p className="maison-eyebrow">Collection Identity</p>
          <h3>{collection?.name ?? 'FlowVault Signature'}</h3>
          <p>{collection?.description || 'A permanent FlowVault design family expressed through considered color, material, and edition choices.'}</p>
        </article>
        <article>
          <p className="maison-eyebrow">Functional Intelligence</p>
          <h3>Main &amp; Always-On</h3>
          <p>The main display and its AOD companion are presented together so visual character and everyday legibility can be judged before purchase.</p>
        </article>
      </section>

      <section className="maison-section maison-technical-section">
        <div className="maison-section-heading">
          <div><p className="maison-eyebrow">Compatibility</p><h2>Made for Your Watch</h2></div>
          <p>The correct technical package is selected for the chosen device after purchase.</p>
        </div>
        <div className="maison-technical-grid">
          <div>
            <h3>Supported Devices</h3>
            <div className="maison-device-list">
              {devices.map((device) => <Link key={device.id} to={`/device/${device.id}`}>{device.brand} {device.name}</Link>)}
            </div>
          </div>
          <div>
            <h3>Technical Editions</h3>
            <dl>
              {packages.map((item) => (
                <div key={item.id}><dt>{item.canonicalName}</dt><dd>{item.revision} · {item.technicalTargetId}</dd></div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {relatedModels.length > 0 && (
        <section className="maison-section maison-related-section">
          <div className="maison-section-heading">
            <div><p className="maison-eyebrow">Continue the Collection</p><h2>Related Models</h2></div>
          </div>
          <div className="maison-model-grid">
            {relatedModels.map((item) => <DesignModelCard key={item.id} model={item} store={data} />)}
          </div>
        </section>
      )}
    </div>
  );
}

export function LegacyFaceResolver() {
  const { id } = useParams();
  const { data, loading } = useStoreReadModel();
  if (loading) return <Status text="Resolving timepiece…" />;
  const model = data && id ? resolveLegacyDesignModel(data, id) : null;
  return model
    ? <Navigate to={`/design/${model.slug || model.id}`} replace />
    : <Navigate to={`/legacy-face/${id ?? ''}`} replace />;
}

function assetUrl(path?: string | null): string | null {
  if (!path) return null;
  return /^(https?:)?\/\//i.test(path) || path.startsWith('/') ? path : `${import.meta.env.BASE_URL}${path}`;
}

function Status({ text }: { text: string }) {
  return <div className="maison-status">{text}</div>;
}
