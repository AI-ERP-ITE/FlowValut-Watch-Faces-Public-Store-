export interface PublicCollection { id: string; name: string; slug: string; description?: string }
export interface PublicDesignModel { id: string; collectionId: string; name: string; slug: string; description?: string; designStory?: string; categories: string[]; tags: string[] }
export interface PublicSku { id: string; productModelId: string; canonicalName: string; variant: { id: string; name: string; code: string; swatch?: string; material?: string }; edition?: { id: string; name: string; code: string } | null }
export interface PublicTechnicalPackage { id: string; skuId: string; technicalTargetId: string; revision: string; releasedZpkPath?: string; canonicalName: string; mainPreviewPath?: string | null; aodPreviewPath?: string | null }
export interface PublicOffer { id: string; type: 'SKU' | 'BUNDLE'; name: string; includedSkuIds: string[]; regularPrice: number; campaignPrice?: number | null; currency: 'USD' }
export interface PublicTechnicalTarget { id: string; name?: string; specGroup?: string; resolution?: string; shape?: string }
export interface PublicDevice { id: string; name: string; brand: string; technicalTargetId: string }
export interface StoreReadModel { collections: PublicCollection[]; designModels: PublicDesignModel[]; skus: PublicSku[]; technicalPackages: PublicTechnicalPackage[]; offers: PublicOffer[]; technicalTargets: PublicTechnicalTarget[]; devices: PublicDevice[]; legacyMappings: Array<{ legacyWatchfaceId: string; productModelId: string; skuId: string }>; metrics: { uniqueDesignModels: number; sellableSkus: number } }

export function modelSkus(model: StoreReadModel, productModelId: string) { return model.skus.filter((sku) => sku.productModelId === productModelId); }
export function skuOffer(model: StoreReadModel, skuId: string) { return model.offers.find((offer) => offer.includedSkuIds.includes(skuId)) ?? null; }
export function skuPackages(model: StoreReadModel, skuId: string) { return model.technicalPackages.filter((item) => item.skuId === skuId); }
export function compatibleDevices(model: StoreReadModel, skuId: string) {
  const targets = new Set(skuPackages(model, skuId).map((item) => item.technicalTargetId));
  return model.devices.filter((device) => targets.has(device.technicalTargetId));
}
export function resolveLegacyDesignModel(model: StoreReadModel, legacyId: string) {
  const mapping = model.legacyMappings.find((item) => item.legacyWatchfaceId === legacyId);
  return mapping ? model.designModels.find((item) => item.id === mapping.productModelId) ?? null : null;
}
