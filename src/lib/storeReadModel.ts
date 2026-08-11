export interface PublicCollection { id: string; name: string; slug: string; description?: string }
export interface PublicDesignModel { id: string; collectionId: string; name: string; slug: string; description?: string; designStory?: string; categories: string[]; tags: string[]; downloads?: number; releasedAt?: string }
export interface PublicSku { id: string; productModelId: string; canonicalName: string; variant: { id: string; name: string; code: string; swatch?: string; material?: string }; edition?: { id: string; name: string; code: string } | null }
export interface PublicTechnicalPackage { id: string; skuId: string; technicalTargetId: string; revision: string; releasedZpkPath?: string; canonicalName: string; mainPreviewPath?: string | null; aodPreviewPath?: string | null }
export interface PublicPaddleCatalogMapping { environment?: 'sandbox' | 'production'; productId?: string; priceId?: string; standardPriceId?: string; promotionalPriceId?: string; activePriceId?: string; syncStatus?: 'NOT_SYNCED' | 'SYNCING' | 'SYNCED' | 'OUT_OF_SYNC' | 'ERROR' | 'ARCHIVED'; lastSyncHash?: string }
export interface PublicOffer { id: string; type: 'SKU' | 'BUNDLE'; name: string; includedSkuIds: string[]; regularPrice: number; campaignPrice?: number | null; currency: 'USD'; paddle?: { sandbox?: PublicPaddleCatalogMapping; production?: PublicPaddleCatalogMapping } }
export interface PublicTechnicalTarget { id: string; name?: string; specGroup?: string; resolution?: string; shape?: string }
export interface PublicDevice { id: string; name: string; brand: string; technicalTargetId: string }
export interface StoreReadModel { collections: PublicCollection[]; designModels: PublicDesignModel[]; skus: PublicSku[]; technicalPackages: PublicTechnicalPackage[]; offers: PublicOffer[]; technicalTargets: PublicTechnicalTarget[]; devices: PublicDevice[]; legacyMappings: Array<{ legacyWatchfaceId: string; productModelId: string; skuId: string }>; metrics: { uniqueDesignModels: number; sellableSkus: number } }

export function compatibleModelIds(model: StoreReadModel, deviceId: string): Set<string> {
  if (!deviceId) return new Set(model.designModels.map((item) => item.id));
  const device = model.devices.find((item) => item.id === deviceId);
  if (!device) return new Set();
  const compatibleSkuIds = new Set(model.technicalPackages
    .filter((item) => item.technicalTargetId === device.technicalTargetId)
    .map((item) => item.skuId));
  return new Set(model.skus.filter((item) => compatibleSkuIds.has(item.id)).map((item) => item.productModelId));
}

export function modelPrice(model: StoreReadModel, productModelId: string): number | null {
  const prices = model.skus
    .filter((sku) => sku.productModelId === productModelId)
    .flatMap((sku) => skuOffers(model, sku.id))
    .map((offer) => offer.campaignPrice ?? offer.regularPrice);
  return prices.length ? Math.min(...prices) : null;
}

export function modelSkus(model: StoreReadModel, productModelId: string) { return model.skus.filter((sku) => sku.productModelId === productModelId); }
export function skuOffers(model: StoreReadModel, skuId: string) { return model.offers.filter((offer) => offer.includedSkuIds.includes(skuId)); }
export function skuOffer(model: StoreReadModel, skuId: string) {
  const offers = skuOffers(model, skuId);
  return offers.find((offer) => offer.type === 'SKU') ?? offers[0] ?? null;
}
export function skuPackages(model: StoreReadModel, skuId: string) { return model.technicalPackages.filter((item) => item.skuId === skuId); }
export function resolveFeaturedSelection(model: StoreReadModel, selectedId: string) {
  const directPackage = model.technicalPackages.find((item) => item.id === selectedId);
  const directSku = model.skus.find((item) => item.id === (directPackage?.skuId ?? selectedId));
  const selectedSku = directSku ?? resolveLegacySku(model, selectedId);
  const directModel = model.designModels.find((item) => item.id === selectedId || item.slug === selectedId);
  const selectedModel = directModel ?? model.designModels.find((item) => item.id === selectedSku?.productModelId);
  const resolvedSku = selectedSku ?? model.skus.find((item) => item.productModelId === selectedModel?.id);
  if (!selectedModel || !resolvedSku) return null;
  const packages = skuPackages(model, resolvedSku.id);
  const selectedPackage = directPackage ?? packages.find((item) => item.mainPreviewPath) ?? packages[0];
  return { model: selectedModel, sku: resolvedSku, pkg: selectedPackage };
}
export function compatibleDevices(model: StoreReadModel, skuId: string) {
  const targets = new Set(skuPackages(model, skuId).map((item) => item.technicalTargetId));
  return model.devices.filter((device) => targets.has(device.technicalTargetId));
}
export function offerCompatibleDevices(model: StoreReadModel, offer: PublicOffer) {
  return model.devices.filter((device) => offer.includedSkuIds.every((skuId) =>
    model.technicalPackages.some((item) => item.skuId === skuId && item.technicalTargetId === device.technicalTargetId),
  ));
}
export function resolveLegacyDesignModel(model: StoreReadModel, legacyId: string) {
  const mapping = model.legacyMappings.find((item) => item.legacyWatchfaceId === legacyId);
  return mapping ? model.designModels.find((item) => item.id === mapping.productModelId) ?? null : null;
}
export function resolveLegacySku(model: StoreReadModel, legacyId: string) {
  const mapping = model.legacyMappings.find((item) => item.legacyWatchfaceId === legacyId);
  return mapping ? model.skus.find((item) => item.id === mapping.skuId) ?? null : null;
}
