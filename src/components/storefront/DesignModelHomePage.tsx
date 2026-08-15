import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, LayoutGrid, List, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStoreReadModel } from '@/context/StoreReadModelContext';
import { getPublicFunctionsBaseUrl } from '@/config/publicRuntimeConfig';
import { DesignModelCard } from './DesignModelCard';
import {
  compatibleDevices,
  compatibleModelIds,
  modelSkus,
  resolveFeaturedSelection,
  skuOffer,
  skuPackages,
  type PublicCollection,
  type PublicDesignModel,
  type PublicDevice,
  type StoreReadModel,
} from '@/lib/storeReadModel';
import { collectionCategoryLabel } from '@/lib/storefrontCategoryPresentation';

interface JournalStory {
  number: string;
  category: string;
  title: string;
  excerpt: string;
  paragraphs: string[];
}

const journalStories: JournalStory[] = [
  {
    number: '01',
    category: 'Craftsmanship',
    title: 'The Art of Digital Guilloché',
    excerpt: 'Guilloché has always been about discipline disguised as decoration. Repeated geometry, precise rhythm and controlled depth transform a flat surface into something that feels alive.',
    paragraphs: [
      'Guilloché has always been about discipline disguised as decoration. Repeated geometry, precise rhythm and controlled depth transform a flat surface into something that feels alive.',
      'At FlowVault, that philosophy is translated into the digital dial. Every pattern is designed to create depth without noise, texture without clutter and craftsmanship without imitation.',
      'The result is not simply a decorative background. It is a surface engineered to reward closer inspection while remaining calm at wrist distance.',
    ],
  },
  {
    number: '02',
    category: 'Design Principles',
    title: 'Why Proportion Creates Luxury',
    excerpt: 'Luxury begins long before materials, color or ornamentation. It begins with proportion.',
    paragraphs: [
      'Luxury begins long before materials, color or ornamentation.',
      'It begins with proportion.',
      'The relationship between the dial, hands, markers, complications and negative space determines whether a watch feels refined or crowded. When those relationships are correct, even a simple design can feel exceptional.',
      'FlowVault treats proportion as the foundation of every timepiece. Decoration may enhance a design, but balance is what gives it permanence.',
      'A premium watch should never need to shout.',
    ],
  },
  {
    number: '03',
    category: 'Collections',
    title: 'Inside the Legacy Collection',
    excerpt: 'Legacy is FlowVault’s purest expression of restrained Swiss luxury.',
    paragraphs: [
      'Legacy is FlowVault’s purest expression of restrained Swiss luxury.',
      'Its identity is built around timeless proportion, quiet confidence and craftsmanship that reveals itself gradually rather than demanding immediate attention.',
      'Each Legacy model begins independently, allowing the architecture, complications and detailing to evolve freely while preserving the same core values: elegance, balance, readability and material realism.',
      'Different watches. The same creative ancestry.',
    ],
  },
  {
    number: '04',
    category: 'Perspective',
    title: 'From Mechanical Watch to Digital Timepiece',
    excerpt: 'FlowVault does not begin with a smartwatch interface. It begins with a watch.',
    paragraphs: [
      'FlowVault does not begin with a smartwatch interface.',
      'It begins with a watch.',
      'Every design is first imagined as a physical object: a dial with depth, materials, machining, reflections, hands and believable construction. Only then is technology introduced.',
      'Battery, health, activity and weather information are integrated as complications rather than added as digital overlays.',
      'The objective is simple: Create a timepiece that feels mechanically credible, digitally intelligent and unmistakably premium.',
    ],
  },
];

export function DesignModelHomePage() {
  const { data, loading, error, globalDeviceId } = useStoreReadModel();
  const [featuredFaceId, setFeaturedFaceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('grid');
  const [selectedStory, setSelectedStory] = useState<JournalStory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'price-asc' | 'price-desc'>('latest');
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'paid'>('all');

  useEffect(() => {
    let cancelled = false;
    async function loadStoreConfig() {
      try {
        const url = `${getPublicFunctionsBaseUrl()}/publicConfig`;
        const res = await fetch(url);
        if (!res.ok) return;
        const payload = (await res.json()) as { featuredFaceId?: string | null };
        if (!cancelled && typeof payload.featuredFaceId === 'string' && payload.featuredFaceId.trim()) {
          setFeaturedFaceId(payload.featuredFaceId.trim());
        }
      } catch {
        // Fall back gracefully to catalog ordering if store config endpoint fails
      }
    }
    loadStoreConfig();
    return () => { cancelled = true; };
  }, []);

  const allowedModelIds = useMemo(
    () => (data ? compatibleModelIds(data, globalDeviceId) : new Set<string>()),
    [data, globalDeviceId]
  );

  const filteredModels = useMemo(
    () => (data ? data.designModels.filter((model) => allowedModelIds.has(model.id)) : []),
    [data, allowedModelIds]
  );

  const displayedModels = useMemo(() => {
    if (!data) return [];
    let result = [...filteredModels];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.designStory?.toLowerCase().includes(q) ||
        m.categories?.some((c) => c.toLowerCase().includes(q))
      );
    }

    if (pricingFilter === 'free') {
      result = result.filter((model) => {
        const skus = modelSkus(data, model.id);
        return skus.some((sku) => {
          const offer = skuOffer(data, sku.id);
          return offer ? Number(offer.regularPrice) === 0 : true;
        });
      });
    } else if (pricingFilter === 'paid') {
      result = result.filter((model) => {
        const skus = modelSkus(data, model.id);
        return skus.some((sku) => {
          const offer = skuOffer(data, sku.id);
          return offer ? Number(offer.regularPrice) > 0 : true;
        });
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'price-asc' || sortBy === 'price-desc') {
        const getPrice = (m: PublicDesignModel) => {
          const sku = modelSkus(data, m.id)[0];
          const offer = sku ? skuOffer(data, sku.id) : null;
          return offer ? Number(offer.regularPrice) : 0;
        };
        const pA = getPrice(a);
        const pB = getPrice(b);
        return sortBy === 'price-asc' ? pA - pB : pB - pA;
      }
      if (sortBy === 'popular') {
        return (b.downloads ?? 0) - (a.downloads ?? 0);
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [data, filteredModels, searchQuery, pricingFilter, sortBy]);

  const featuredData = useMemo(() => {
    if (!data) return null;
    const configuredCandidate = featuredFaceId ? resolveFeaturedSelection(data, featuredFaceId) : null;
    const configured = configuredCandidate && filteredModels.some((model) => model.id === configuredCandidate.model.id) ? configuredCandidate : null;
    if (configured) return configured;
    const firstModel = filteredModels[0] ?? (!globalDeviceId ? data.designModels[0] : undefined);
    if (!firstModel) return null;
    const firstSku = modelSkus(data, firstModel.id)[0];
    if (!firstSku) return null;
    return {
      model: firstModel,
      sku: firstSku,
      pkg: skuPackages(data, firstSku.id).find((item) => item.mainPreviewPath) ?? skuPackages(data, firstSku.id)[0],
    };
  }, [data, featuredFaceId, filteredModels, globalDeviceId]);

  if (loading) return <Status text="Preparing the FlowVault storefront…" />;
  if (error || !data) return <Status text={error ?? 'Store unavailable'} />;

  const heroSkuPackage = featuredData
    ? skuPackages(data, featuredData.sku.id).find((item) => item.mainPreviewPath)
    : null;
  const heroImage = assetUrl(heroSkuPackage?.mainPreviewPath);

  const heroCollection = featuredData
    ? data.collections.find((item) => item.id === featuredData.model.collectionId)
    : null;

  return (
    <div className="maison-home">
      <section className="maison-cinematic-hero relative overflow-hidden min-h-[75vh] flex items-center" aria-labelledby="maison-hero-title">
        <div className="maison-hero-atmosphere" />
        <div className="w-full max-w-[1320px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] items-center gap-10 py-10 lg:py-12 z-10">
          <div className="maison-hero-content p-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs uppercase tracking-[0.2em] text-[#e8d2a8] font-mono px-2.5 py-1 rounded bg-[#e8d2a8]/10 border border-[#e8d2a8]/30">
                Featured Masterpiece
              </span>
              <span className="text-xs uppercase tracking-widest text-[#a09a8e]">
                {heroCollection?.name ?? 'FlowVault'} Collection
              </span>
            </div>
            
            <h1 id="maison-hero-title" className="text-3xl sm:text-4xl lg:text-5xl font-serif text-[#f4e8d1] leading-[1.05] my-3">
              {featuredData ? featuredData.model.name : 'Time, refined for the digital age.'}
            </h1>

            <p className="text-sm text-[#a09a8e] max-w-xl leading-relaxed mb-5">
              {featuredData?.model.designStory || featuredData?.model.description || 'Crafted for those who value restraint, proportion, and intelligence over attention.'}
            </p>

            {featuredData && (
              <div className="grid grid-cols-3 gap-4 p-3.5 rounded-xl border border-[#3a3528]/40 bg-[#12151c]/60 max-w-lg mb-6 text-left">
                <div>
                  <span className="text-[11px] text-[#8e8778] uppercase tracking-widest block">Collection</span>
                  <span className="text-xs text-[#e8d2a8] font-medium block truncate">{heroCollection?.name ?? 'Signature'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#8e8778] uppercase tracking-widest block">Edition</span>
                  <span className="text-xs text-[#e8d2a8] font-medium block truncate">{featuredData.sku.edition?.name ?? featuredData.sku.variant.name}</span>
                </div>
                <div>
                  <span className="text-[11px] text-[#8e8778] uppercase tracking-widest block">Craft</span>
                  <span className="text-xs text-[#e8d2a8] font-medium block truncate">Digital Horology</span>
                </div>
              </div>
            )}

            <div className="maison-actions">
              {featuredData ? (
                <Link to={`/design/${featuredData.model.slug || featuredData.model.id}`} className="maison-button maison-button-primary">
                  Explore {featuredData.model.name} <ArrowRight size={15} />
                </Link>
              ) : null}
              <a href="#all-models" className="maison-button maison-button-quiet">
                Browse All Watches
              </a>
            </div>
          </div>

          {heroImage && (
            <div className="flex flex-col items-center justify-center relative" aria-hidden="true">
              <div className="absolute inset-0 rounded-full bg-[#e8d2a8]/10 blur-3xl pointer-events-none" />
              <img
                src={heroImage}
                alt={featuredData ? featuredData.model.name : "Featured Watchface"}
                className="w-[260px] sm:w-[300px] lg:w-[340px] aspect-square object-contain rounded-full border border-[#e8d2a8]/35 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-2.5 bg-[#090b0f]/80 relative z-10"
              />
              {featuredData && (
                <span className="mt-3 text-[11px] uppercase tracking-[0.2em] text-[#a09a8e] font-mono">
                  {featuredData.sku.variant.name}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── 1. CATALOG FRONT & CENTER WITH INTEGRATED SEARCH, FILTER & SORT ── */}
      <section id="all-models" className="maison-section maison-all-models-section">
        <div className="maison-section-heading">
          <div>
            <p className="maison-eyebrow">The Complete Selection</p>
            <h2>Explore All Timepieces</h2>
            <p>{displayedModels.length} design model{displayedModels.length === 1 ? '' : 's'} match your criteria.</p>
          </div>
        </div>

        {/* Catalog Control Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 my-6 p-4 rounded-xl border border-[#3a3528]/40 bg-[#12151c]/80">
          {/* Live Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e8778]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search timepieces by name, collection, or style…"
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-[#3a3528] bg-[#090b0f] text-xs text-[#f4e8d1] placeholder-[#8e8778]/60 focus:outline-none focus:border-[#e8d2a8]"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e8778] hover:text-[#e8d2a8]">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-lg border border-[#3a3528] bg-[#090b0f] text-xs text-[#e8d2a8] focus:outline-none focus:border-[#e8d2a8] cursor-pointer"
            >
              <option value="latest">Sort: Latest Released</option>
              <option value="popular">Sort: Most Popular</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>

            {/* Access/Pricing Filter Pills */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#090b0f] border border-[#3a3528]/40 text-xs">
              {(['all', 'free', 'paid'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPricingFilter(mode)}
                  className={`px-3 py-1 rounded capitalize transition-colors cursor-pointer ${pricingFilter === mode ? 'bg-[#28231c] text-[#e8d2a8] font-semibold' : 'text-[#8e8778] hover:text-[#e8d2a8]'}`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#090b0f] border border-[#3a3528]/40" role="group" aria-label="Layout view mode">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                className={`p-1.5 rounded cursor-pointer transition-colors ${viewMode === 'grid' ? 'bg-[#28231c] text-[#e8d2a8]' : 'text-[#8e8778] hover:text-[#e8d2a8]'}`}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('row')}
                aria-label="Row list view"
                aria-pressed={viewMode === 'row'}
                className={`p-1.5 rounded cursor-pointer transition-colors ${viewMode === 'row' ? 'bg-[#28231c] text-[#e8d2a8]' : 'text-[#8e8778] hover:text-[#e8d2a8]'}`}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {displayedModels.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="maison-model-grid">
              {displayedModels.map((model) => <DesignModelCard key={model.id} model={model} store={data} />)}
            </div>
          ) : (
            <div className="flex flex-col gap-4 mt-6">
              {displayedModels.map((model) => <DesignModelRowCard key={model.id} model={model} store={data} />)}
            </div>
          )
        ) : (
          <div className="maison-empty-state text-center py-12 text-[#a09a8e]">
            No timepieces found matching your search or filter selection.
          </div>
        )}
      </section>

      {/* ── 3. MAISON PHILOSOPHY ───────────────────────────────────────────── */}
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

      {/* ── 4. FLOWVAULT JOURNAL ───────────────────────────────────────────── */}
      <section id="journal" className="maison-section maison-journal-section">
        <div className="maison-section-heading">
          <div><p className="maison-eyebrow">FlowVault Journal</p><h2>Stories of Digital Horology</h2></div>
          <p>Click any story below to explore notes on proportion, craft, collection identity, and the evolving language of time.</p>
        </div>
        <div className="maison-journal-grid">
          {journalStories.map((story) => (
            <article
              key={story.number}
              onClick={() => setSelectedStory(story)}
              className="maison-journal-card cursor-pointer p-6 rounded-xl border border-[#3a3528]/40 bg-[#12151c]/80 hover:border-[#e8d2a8]/60 hover:bg-[#1a202c] transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-[#e8d2a8]">{story.number} — {story.category}</span>
                <span className="text-xs text-[#e8d2a8] group-hover:translate-x-1 transition-transform flex items-center gap-1">Read <ArrowRight size={13} /></span>
              </div>
              <h3 className="text-xl font-serif text-[#f4e8d1] mb-2 group-hover:text-[#e8d2a8] transition-colors">{story.title}</h3>
              <p className="text-xs text-[#a09a8e] line-clamp-3 leading-relaxed">{story.excerpt}</p>
            </article>
          ))}
        </div>

        {selectedStory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedStory(null)}>
            <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[#e8d2a8]/40 bg-[#0d0f14] p-8 text-[#f4e8d1] shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setSelectedStory(null)}
                aria-label="Close article"
                className="absolute top-6 right-6 p-2 rounded-full border border-[#3a3528] bg-[#1a202c] text-[#a09a8e] hover:text-[#e8d2a8] hover:border-[#e8d2a8] transition-all"
              >
                <X size={18} />
              </button>

              <span className="text-xs uppercase tracking-widest text-[#e8d2a8] font-mono block mb-2">{selectedStory.number} — {selectedStory.category}</span>
              <h2 className="text-3xl font-serif text-[#e8d2a8] mb-6 leading-tight">{selectedStory.title}</h2>

              <div className="space-y-4 text-sm text-[#d0caae] leading-relaxed border-t border-[#3a3528]/50 pt-6">
                {selectedStory.paragraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-[#3a3528]/40 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedStory(null)}
                  className="px-5 py-2 text-xs uppercase tracking-widest font-semibold rounded-lg bg-[#e8d2a8] text-[#090b0f] hover:bg-[#f4e8d1] transition-colors"
                >
                  Close Article
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── 5. VIP DISPATCH NEWSLETTER ─────────────────────────────────────── */}
      <section className="maison-newsletter-section flex flex-col md:flex-row items-center justify-between gap-6 p-6 md:p-8 rounded-2xl border border-[#3a3528]/40 bg-[#12151c]/80 my-6">
        <div className="max-w-xl">
          <p className="maison-eyebrow">Private Dispatch</p>
          <h2 className="text-xl sm:text-2xl font-serif text-[#f4e8d1] mb-2">Join the FlowVault Registry.</h2>
          <p className="text-xs text-[#a09a8e] leading-relaxed">Receive private collection drops, design stories, and release announcements directly to your inbox.</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); alert('Thank you for subscribing to the FlowVault Dispatch.'); }} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <input
            type="email"
            placeholder="Enter your email address"
            required
            className="px-4 py-2.5 rounded-lg border border-[#3a3528] bg-[#090b0f] text-xs text-[#f4e8d1] placeholder-[#a09a8e]/60 focus:outline-none focus:border-[#e8d2a8] min-w-[260px]"
          />
          <button type="submit" className="maison-button maison-button-primary whitespace-nowrap cursor-pointer">
            Subscribe <ArrowRight size={15} />
          </button>
        </form>
      </section>
    </div>
  );
}

function DesignModelRowCard({ model, store }: { model: PublicDesignModel; store: StoreReadModel }) {
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
  const devices = firstSku ? compatibleDevices(store, firstSku.id) : [];

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-5 rounded-xl border border-[#3a3528]/40 bg-[#12151c]/80 hover:border-[#e8d2a8]/50 transition-all">
      <div className="flex items-center gap-5 w-full md:w-auto">
        <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 flex items-center justify-center p-2 rounded-lg bg-[#090b0f]">
          {preview ? (
            <img src={preview} alt={model.name} className="w-full h-full object-contain max-h-[100px]" />
          ) : (
            <div className="w-full h-full bg-[#1b202c] rounded" />
          )}
        </div>
        <div>
          <span className="text-xs uppercase tracking-widest text-[#e8d2a8]/70 block">{collection?.name ?? 'FlowVault'}</span>
          <h3 className="text-lg font-semibold text-[#f4e8d1]">{model.name}</h3>
          <p className="text-xs text-[#a09a8e] line-clamp-2 max-w-xl mt-1">{model.description || model.designStory}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {devices.slice(0, 3).map((d: PublicDevice) => (
              <span key={d.id} className="text-[10px] px-2 py-0.5 rounded bg-[#1f2633] text-[#c4b595] border border-[#3a3528]/30">
                {d.name}
              </span>
            ))}
            {devices.length > 3 && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#1f2633] text-[#8e8778]">
                +{devices.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-[#3a3528]/30">
        <div className="text-right">
          <span className="text-xs text-[#8e8778] block">Price</span>
          <span className="text-base font-medium text-[#e8d2a8]">
            {offer ? `$${(offer.campaignPrice ?? offer.regularPrice).toFixed(2)}` : 'Discover'}
          </span>
        </div>
        <Link
          to={`/design/${model.slug || model.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest font-medium rounded-md bg-[#e8d2a8] text-[#090b0f] hover:bg-[#f4e8d1] transition-colors"
        >
          View Details <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

export function CollectionEditorialCard({
  collection,
  store,
  index,
  allowedModelIds,
}: {
  collection: PublicCollection;
  store: StoreReadModel;
  index: number;
  allowedModelIds: Set<string>;
}) {
  const models = store.designModels.filter((item) => item.collectionId === collection.id && allowedModelIds.has(item.id));
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
          <p>{collectionCategoryLabel(models)}</p>
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

function Status({ text }: { text: string }) {
  return <div className="maison-status">{text}</div>;
}
