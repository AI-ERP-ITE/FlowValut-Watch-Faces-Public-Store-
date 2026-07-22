import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStoreReadModel } from '@/context/StoreReadModelContext';
import { DesignModelCard } from './DesignModelCard';
import { resolveLegacySku, skuPackages } from '@/lib/storeReadModel';

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
        const baseUrl = import.meta.env.BASE_URL;

        if (backendBase) {
          const { fetchStorefrontConfigFromFirebase } = await import('@/lib/studioFirebasePublishApi');
          const cfg = await fetchStorefrontConfigFromFirebase();
          if (!cancelled) setFeaturedFaceId(cfg.featuredFaceId ?? null);
          return;
        }

        const response = await fetch(`${baseUrl}storeConfig.json`);
        if (!response.ok) return;
        const cfgData = await response.json();
        if (!cancelled) setFeaturedFaceId(cfgData.featuredFaceId ?? null);
      } catch {}
    }
    loadStoreConfig();
    return () => { cancelled = true; };
  }, []);

  const featuredData = useMemo(() => {
    if (!data || !featuredFaceId) return null;

    // Try as a legacy SKU ID first
    const legacySku = resolveLegacySku(data, featuredFaceId);
    if (legacySku) {
      const model = data.designModels.find(m => m.id === legacySku.productModelId);
      if (model) {
        const pkgs = skuPackages(data, legacySku.id);
        const pkg = pkgs.find(p => p.mainPreviewPath) || pkgs[0];
        return { model, sku: legacySku, pkg };
      }
    }

    // Then try as a direct DesignModel ID or Slug
    const directModel = data.designModels.find(m => m.id === featuredFaceId || m.slug === featuredFaceId);
    if (directModel) {
      const modelSkus = data.skus.filter(s => s.productModelId === directModel.id);
      const skuToUse = modelSkus[0];
      if (skuToUse) {
        const pkgs = skuPackages(data, skuToUse.id);
        const pkg = pkgs.find(p => p.mainPreviewPath) || pkgs[0];
        return { model: directModel, sku: skuToUse, pkg };
      }
    }

    return null;
  }, [data, featuredFaceId]);

  if (loading) return <Status text="Loading the collection…" />; if (error || !data) return <Status text={error ?? 'Store unavailable'} />;

  let filteredModels = data.designModels;
  if (globalDeviceId) {
    const device = data.devices.find((d) => d.id === globalDeviceId);
    if (device) {
      const compatibleSkuIds = new Set(
        data.technicalPackages
          .filter((pkg) => pkg.technicalTargetId === device.technicalTargetId)
          .map((pkg) => pkg.skuId)
      );
      const compatibleModelIds = new Set(
        data.skus
          .filter((sku) => compatibleSkuIds.has(sku.id))
          .map((sku) => sku.productModelId)
      );
      filteredModels = data.designModels.filter((model) => compatibleModelIds.has(model.id));
    }
  }

  const baseUrl = import.meta.env.BASE_URL;
  const previewPath = featuredData?.pkg?.mainPreviewPath;
  const imageSrc = previewPath ? (/^(https?:)?\/\//i.test(previewPath) ? previewPath : `${baseUrl}${previewPath}`) : null;

  return (
    <main className="min-h-screen vault-shell">
      <section className="vault-page-hero border-b border-[#20252f] px-6 py-16">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="vault-micro">FlowVault finished timepieces</p>
            <h1 className="mt-3 text-4xl font-light text-[#e7e9ee]">Design Models</h1>
            <p className="mt-3 max-w-2xl text-[#9ca5b3]">Each model is one complete watch design. Choose its color, material, and widget edition inside the model page; watch compatibility does not create duplicate products.</p>
            <div className="mt-6 flex gap-3 text-sm">
              <span className="rounded border border-[#343b48] px-3 py-2 text-[#e8d2a8]">{data.metrics.uniqueDesignModels} Unique Models</span>
              <span className="rounded border border-[#343b48] px-3 py-2 text-[#e8d2a8]">{data.metrics.sellableSkus} Sellable SKUs</span>
            </div>
          </div>
          {featuredData && (
            <div className="flex items-center justify-center lg:justify-end mt-10 lg:mt-0">
              <div className="store-hero-watch">
                <div className="store-hero-watch-inner">
                  {imageSrc ? (
                    <Link to={`/model/${featuredData.model.slug || featuredData.model.id}`}>
                    <img
                      src={imageSrc}
                      alt={`${featuredData.model.name} preview`}
                      className="absolute inset-0 w-full h-full object-cover opacity-35 hover:opacity-50 transition-opacity"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="text-2xl font-light tracking-[0.04em] text-[#f7f8fa]">Featured</div>
                      <p className="mt-3 text-xs text-[#E8D2A8] max-w-[220px] truncate">
                        {featuredData.model.name}
                      </p>
                      <p className="text-[10px] text-[#9ca3af] mt-1">
                        Click to view model
                      </p>
                    </div>
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#E8D2A8] pointer-events-none" />
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-[#2a313e] overflow-hidden pointer-events-none">
                      <div className="w-3/4 h-full bg-[#D4B57D]" />
                    </div>
                    <div className="absolute inset-0 ring-1 ring-white/10 pointer-events-none" />
                  </Link>
                ) : (
                  <div className="w-24 h-24 rounded-full border-2 border-[#465064] flex items-center justify-center">
                    <span className="text-[#7f8794] text-4xl">⌚</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-wrap gap-2">
          {data.collections.map((item) => <Link key={item.id} to={`/collection/${item.slug || item.id}`} className="rounded-full border border-[#343b48] px-3 py-1.5 text-sm text-[#c9ced7] hover:border-[#c7a86f]">{item.name}</Link>)}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModels.map((model) => <DesignModelCard key={model.id} model={model} store={data} />)}
        </div>
      </section>
    </main>
  );
}
function Status({ text }: { text: string }) { return <div className="min-h-screen grid place-items-center text-sm text-[#8e96a3]">{text}</div>; }
