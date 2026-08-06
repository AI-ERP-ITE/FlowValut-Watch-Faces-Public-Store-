import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStoreReadModel } from '@/context/StoreReadModelContext';
import { DesignModelCard } from './DesignModelCard';
import {
  modelSkus,
  resolveFeaturedSelection,
  skuPackages,
  type PublicCollection,
  type PublicDesignModel,
  type StoreReadModel,
} from '@/lib/storeReadModel';

const journalStories = [
  { title: 'The Art of Digital Guilloché', category: 'Craftsmanship', number: '01' },
  { title: 'Why Proportion Creates Luxury', category: 'Design Principles', number: '02' },
  { title: 'Inside the Legacy Collection', category: 'Collections', number: '03' },
  { title: 'From Mechanical Watch to Digital Timepiece', category: 'Perspective', number: '04' },
];

export function DesignModelHomePage() {
  const { data, loading, error, globalDeviceId } = useStoreReadModel();
  const [featuredFaceId, setFeaturedFaceId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadStoreConfig() {
      try {
        const backendBase =
          (import.meta.env.VITE_FIREBASE_FUNCTIONS_BASE_URL as string | undefined)?.trim() ||
          (import.meta.env.VITE_PURCHASE_FUNCTIONS_BASE_URL as string | undefined)?.trim() ||
          (import.meta.env.VITE_GITHUB_FUNCTIONS_BASE_URL as string | undefined)?.trim();

        if (backendBase) {
          const { fetchStorefrontConfigFromFirebase } = await import('@/lib/studioFirebasePublishApi');
          const config = await fetchStorefrontConfigFromFirebase();
          if (!cancelled) setFeaturedFaceId(config.featuredFaceId ?? null);
          return;
        }

        const response = await fetch(`${import.meta.env.BASE_URL}storeConfig.json`);
        if (!response.ok) return;
        const config = await response.json();
        if (!cancelled) setFeaturedFaceId(config.featuredFaceId ?? null);
      } catch {
        // The first available design remains the visual fallback.
      }
    }
    loadStoreConfig();
    return () => { cancelled = true; };
  }, []);

  const filteredModels = useMemo(() => {
    if (!data || !globalDeviceId) return data?.designModels ?? [];
    const device = data.devices.find((item) => item.id === globalDeviceId);
    if (!device) return data.designModels;
    const compatibleSkuIds = new Set(
      data.technicalPackages
        .filter((item) => item.technicalTargetId === device.technicalTargetId)
        .map((item) => item.skuId),
    );
    const compatibleModelIds = new Set(
      data.skus
        .filter((item) => compatibleSkuIds.has(item.id))
        .map((item) => item.productModelId),
    );
    return data.designModels.filter((item) => compatibleModelIds.has(item.id));
  }, [data, globalDeviceId]);

  const featuredData = useMemo(() => {
    if (!data) return null;
    const configured = featuredFaceId ? resolveFeaturedSelection(data, featuredFaceId) : null;
    if (configured) return configured;
    const firstModel = filteredModels[0] ?? data.designModels[0];
    if (!firstModel) return null;
    const firstSku = modelSkus(data, firstModel.id)[0];
    if (!firstSku) return null;
    return {
      model: firstModel,
      sku: firstSku,
      pkg: skuPackages(data, firstSku.id).find((item) => item.mainPreviewPath) ?? skuPackages(data, firstSku.id)[0],
    };
  }, [data, featuredFaceId, filteredModels]);

  const categoryLinks = useMemo(() => {
    const labels = new Map<string, string>();
    data?.designModels.forEach((model) => {
      model.categories.forEach((category) => labels.set(category.toLowerCase(), category));
    });
    return Array.from(labels.entries()).slice(0, 8);
  }, [data]);

  if (loading) return <Status text="Preparing the collection…" />;
  if (error || !data) return <Status text={error ?? 'Store unavailable'} />;

  const heroImage = assetUrl(featuredData?.pkg?.mainPreviewPath);
  const heroCollection = featuredData
    ? data.collections.find((item) => item.id === featuredData.model.collectionId)
    : null;
  const latestModels = filteredModels.slice(0, 4);

  return (
    <div className="maison-home">
      <section className="maison-cinematic-hero" aria-labelledby="maison-hero-title">
        <div className="maison-hero-atmosphere" />
        {heroImage && (
          <div className="maison-hero-timepiece" aria-hidden="true">
            <img src={heroImage} alt="" />
          </div>
        )}
        <div className="maison-hero-content">
          <p className="maison-eyebrow">{heroCollection?.name ?? 'FlowVault'} Collection</p>
          <h1 id="maison-hero-title">Time, refined<br />for the digital age.</h1>
          <p>Crafted for those who value restraint, proportion, and intelligence over attention.</p>
          <div className="maison-actions">
            {heroCollection && (
              <Link to={`/collection/${heroCollection.slug || heroCollection.id}`} className="maison-button maison-button-primary">
                Enter Collection <ArrowRight size={16} />
              </Link>
            )}
            {featuredData && (
              <Link to={`/design/${featuredData.model.slug || featuredData.model.id}`} className="maison-button maison-button-quiet">
                Discover the Timepiece
              </Link>
            )}
          </div>
        </div>
        <a href="#collections" className="maison-scroll-cue" aria-label="Continue to collections">
          <span>Explore</span><ArrowDown size={15} />
        </a>
      </section>

      <section id="collections" className="maison-section maison-collections-section">
        <div className="maison-section-heading">
          <div>
            <p className="maison-eyebrow">Design DNA</p>
            <h2>Collections</h2>
          </div>
          <p>Distinct design families, each governed by its own proportion, atmosphere, and character.</p>
        </div>

        {categoryLinks.length > 0 && (
          <nav className="maison-category-links" aria-label="Explore by category">
            <span>Explore by character</span>
            {categoryLinks.map(([slug, label]) => (
              <Link key={slug} to={`/category/${slug}`}>{label}</Link>
            ))}
          </nav>
        )}

        <div className="maison-collection-grid">
          {data.collections.map((collection, index) => (
            <CollectionEditorialCard
              key={collection.id}
              collection={collection}
              store={data}
              index={index}
            />
          ))}
        </div>
      </section>

      {featuredData && (
        <section className="maison-feature-editorial">
          <div className="maison-feature-image">
            {heroImage && <img src={heroImage} alt={`${featuredData.model.name} digital timepiece`} />}
          </div>
          <div className="maison-feature-copy">
            <p className="maison-eyebrow">Featured Timepiece</p>
            <h2>{featuredData.model.name}</h2>
            <p>{featuredData.model.designStory || featuredData.model.description || 'A study in balanced information, disciplined ornament, and considered digital watchmaking.'}</p>
            <dl className="maison-feature-facts">
              <div><dt>Collection</dt><dd>{heroCollection?.name ?? 'Signature'}</dd></div>
              <div><dt>Edition</dt><dd>{featuredData.sku.edition?.name ?? featuredData.sku.variant.name}</dd></div>
              <div><dt>Craft</dt><dd>Digital Horology</dd></div>
            </dl>
            <Link to={`/design/${featuredData.model.slug || featuredData.model.id}`} className="maison-text-link">
              Explore the Timepiece <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      )}

      <section id="philosophy" className="maison-statement-section">
        <p className="maison-eyebrow">Our Philosophy</p>
        <blockquote>
          FlowVault does not create watchfaces.<br />
          <em>FlowVault creates digital timepieces.</em>
        </blockquote>
        <p>Swiss watchmaking principles meet digital craftsmanship: emotional design, exact proportion, and functional intelligence composed for the wrist.</p>
      </section>

      <section className="maison-section maison-craft-section">
        <div className="maison-section-heading">
          <div><p className="maison-eyebrow">The Discipline</p><h2>Crafted in Layers</h2></div>
          <p>Every detail earns its place. Nothing exists without purpose.</p>
        </div>
        <div className="maison-craft-grid">
          <CraftPrinciple number="01" title="Proportion" text="Information is balanced with the precision of a mechanical dial." />
          <CraftPrinciple number="02" title="Material" text="Light, depth, texture, and shadow create a convincing digital presence." />
          <CraftPrinciple number="03" title="Intelligence" text="Useful complications remain legible, calm, and native to the design." />
        </div>
      </section>

      <section id="new-releases" className="maison-section maison-releases-section">
        <div className="maison-section-heading">
          <div><p className="maison-eyebrow">Curated Selection</p><h2>Latest Releases</h2></div>
          <p>{globalDeviceId ? 'Selected for your chosen watch.' : 'Recent expressions from the FlowVault collection.'}</p>
        </div>
        <div className="maison-model-grid">
          {latestModels.map((model) => <DesignModelCard key={model.id} model={model} store={data} />)}
        </div>
      </section>

      <section id="journal" className="maison-section maison-journal-section">
        <div className="maison-section-heading">
          <div><p className="maison-eyebrow">FlowVault Journal</p><h2>Stories of Digital Horology</h2></div>
          <p>Notes on proportion, craft, collection identity, and the evolving language of time.</p>
        </div>
        <div className="maison-journal-grid">
          {journalStories.map((story) => (
            <article key={story.number} className="maison-journal-card">
              <span>{story.number}</span>
              <div><p>{story.category}</p><h3>{story.title}</h3></div>
            </article>
          ))}
        </div>
      </section>

      <section className="maison-newsletter-section">
        <div>
          <p className="maison-eyebrow">Private Dispatch</p>
          <h2>Enter the FlowVault Journal.</h2>
          <p>Receive collection stories, design notes, and release announcements through our established client channel.</p>
        </div>
        <a href="mailto:business@fvwatchfaces.com?subject=FlowVault%20Journal" className="maison-button maison-button-primary">
          Request Journal Access <ArrowRight size={16} />
        </a>
      </section>

      <section className="maison-section maison-all-models-section">
        <div className="maison-section-heading">
          <div><p className="maison-eyebrow">The Complete Selection</p><h2>Explore All Timepieces</h2></div>
          <p>{filteredModels.length} design model{filteredModels.length === 1 ? '' : 's'} available for discovery.</p>
        </div>
        <div className="maison-model-grid">
          {filteredModels.map((model) => <DesignModelCard key={model.id} model={model} store={data} />)}
        </div>
      </section>
    </div>
  );
}

function CollectionEditorialCard({
  collection,
  store,
  index,
}: {
  collection: PublicCollection;
  store: StoreReadModel;
  index: number;
}) {
  const models = store.designModels.filter((item) => item.collectionId === collection.id);
  const previewModel = models.find((model) => getModelPreview(store, model)) ?? models[0];
  const preview = previewModel ? getModelPreview(store, previewModel) : null;
  return (
    <Link to={`/collection/${collection.slug || collection.id}`} className="maison-collection-card">
      <div className="maison-collection-media">
        {preview ? <img src={preview} alt={`${collection.name} collection`} /> : <div className="maison-image-fallback" />}
        <span>{String(index + 1).padStart(2, '0')}</span>
      </div>
      <div className="maison-collection-copy">
        <div>
          <p>{inferDesignDna(collection, models)}</p>
          <h3>{collection.name}</h3>
        </div>
        <span>{models.length} Model{models.length === 1 ? '' : 's'} <ArrowRight size={15} /></span>
      </div>
    </Link>
  );
}

function CraftPrinciple({ number, title, text }: { number: string; title: string; text: string }) {
  return <article><span>{number}</span><h3>{title}</h3><p>{text}</p></article>;
}

function getModelPreview(store: StoreReadModel, model: PublicDesignModel): string | null {
  const sku = modelSkus(store, model.id)[0];
  const path = sku ? skuPackages(store, sku.id).find((item) => item.mainPreviewPath)?.mainPreviewPath : null;
  return assetUrl(path);
}

function assetUrl(path?: string | null): string | null {
  if (!path) return null;
  return /^(https?:)?\/\//i.test(path) || path.startsWith('/') ? path : `${import.meta.env.BASE_URL}${path}`;
}

function inferDesignDna(collection: PublicCollection, models: PublicDesignModel[]): string {
  const identity = `${collection.name} ${collection.description ?? ''} ${models.flatMap((model) => [...model.categories, ...model.tags]).join(' ')}`.toLowerCase();
  if (/sport|performance|racing|torque|forge|apex/.test(identity)) return 'Performance';
  if (/dark|goth|revenant|obsidian|phantom/.test(identity)) return 'Nocturnal';
  if (/classic|elegant|luxury|legacy|monarch|regent|sovereign/.test(identity)) return 'Classical';
  if (/minimal|simple|gossamer/.test(identity)) return 'Essential';
  return 'Signature';
}

function Status({ text }: { text: string }) {
  return <div className="maison-status">{text}</div>;
}
