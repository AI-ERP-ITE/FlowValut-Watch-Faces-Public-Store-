import { z } from 'zod';

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const codePattern = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const internalCodePattern = /^[A-Z0-9]+(?:-[A-Z0-9]+)*(?:-v[1-9]\d*\.\d+)?$/;
const revisionPattern = /^v[1-9]\d*\.\d+$/;

const idSchema = z.string().trim().min(1).max(120).regex(idPattern);
const codeSchema = z.string().trim().min(1).max(160).regex(codePattern);
const isoDateSchema = z.string().datetime({ offset: true });
const storagePathSchema = z.string().trim().min(1).max(1024).refine(
  (value) => !value.startsWith('/') && !value.includes('..') && !value.includes('\\'),
  'Storage paths must be relative and cannot traverse directories',
);

export const workshopBuildStateSchema = z.enum(['TESTING', 'APPROVED', 'PROMOTED', 'TRASHED']);
export const storeProductStateSchema = z.enum(['DRAFT', 'READY', 'LIVE', 'OFFLINE', 'ARCHIVED']);
export const technicalPackageStateSchema = z.enum([
  'BUILDING',
  'VALIDATING',
  'READY',
  'CURRENT',
  'SUPERSEDED',
  'FAILED',
  'TRASHED',
]);

export const workshopProjectSchema = z.object({
  id: idSchema,
  workingTitle: z.string().trim().min(1).max(160),
  folder: z.string().trim().max(160).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
  targetDeviceId: idSchema.optional(),
  currentBuildId: idSchema.optional(),
  promotedProductModelId: idSchema.optional(),
  buildCount: z.number().int().nonnegative(),
  storageBytes: z.number().int().nonnegative(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  createdBy: z.string().trim().min(1).max(128),
});

export const workshopBuildSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  buildNumber: z.number().int().positive(),
  workshopLabel: z.string().trim().min(1).max(160),
  parentBuildId: idSchema.optional(),
  state: workshopBuildStateSchema,
  fvwfPath: storagePathSchema,
  zpkPath: storagePathSchema,
  mainPreviewPath: storagePathSchema.optional(),
  aodPreviewPath: storagePathSchema.optional(),
  specGroup: z.string().trim().min(1).max(120).optional(),
  deviceId: idSchema.optional(),
  resolution: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  notes: z.string().max(5000).optional(),
  hashes: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/i)),
  storageBytes: z.number().int().nonnegative(),
  previousState: workshopBuildStateSchema.exclude(['TRASHED']).optional(),
  deletedAt: isoDateSchema.optional(),
  deletedBy: z.string().trim().min(1).max(128).optional(),
  createdAt: isoDateSchema,
  createdBy: z.string().trim().min(1).max(128),
}).superRefine((build, context) => {
  if (build.state === 'TRASHED' && !build.previousState) {
    context.addIssue({ code: 'custom', path: ['previousState'], message: 'Trashed builds require a previous state' });
  }
});

export const designDnaSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(120),
  code: codeSchema,
  status: z.enum(['ACTIVE', 'ARCHIVED']),
});

export const collectionSchema = z.object({
  id: idSchema,
  designDnaId: idSchema,
  name: z.string().trim().min(1).max(120),
  code: codeSchema,
  slug: idSchema,
  description: z.string().max(5000).optional(),
  state: storeProductStateSchema,
});

export const productModelSchema = z.object({
  id: idSchema,
  collectionId: idSchema,
  modelNumber: z.number().int().positive(),
  name: z.string().trim().min(1).max(160),
  code: codeSchema,
  slug: idSchema,
  description: z.string().max(5000).optional(),
  designStory: z.string().max(10000).optional(),
  defaultSkuId: idSchema.optional(),
  categories: z.array(z.string().trim().min(1).max(80)).max(30),
  tags: z.array(z.string().trim().min(1).max(80)).max(50),
  state: storeProductStateSchema,
});

const variantSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(120),
  code: codeSchema,
  swatch: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  material: z.string().trim().max(500).optional(),
});

const editionSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(120),
  code: codeSchema,
});

export const skuSchema = z.object({
  id: idSchema,
  productModelId: idSchema,
  variant: variantSchema,
  edition: editionSchema.optional(),
  canonicalName: z.string().trim().min(1).max(240),
  state: storeProductStateSchema,
});

export const deviceSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(160),
  brand: z.string().trim().min(1).max(80),
  technicalTargetId: idSchema,
  legacyModelSlug: idSchema.optional(),
});

export const technicalTargetSchema = z.object({
  id: idSchema,
  code: codeSchema,
  specGroup: z.string().trim().min(1).max(120),
  resolution: z.string().regex(/^\d+x\d+$/),
  shape: z.enum(['round', 'square']),
  supportedConfigVersions: z.array(z.enum(['v2', 'v3'])).min(1),
});

export const technicalPackageSchema = z.object({
  id: idSchema,
  skuId: idSchema,
  technicalTargetId: idSchema,
  revision: z.string().regex(revisionPattern),
  internalCode: z.string().trim().min(1).max(200).regex(internalCodePattern),
  state: technicalPackageStateSchema,
  approvedWorkshopBuildId: idSchema,
  approvedZpkPath: storagePathSchema,
  releasedZpkPath: storagePathSchema,
  parityReportPath: storagePathSchema,
  embeddedCanonicalName: z.string().trim().min(1).max(240),
  hashes: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/i)),
  createdAt: isoDateSchema,
});

export const offerSchema = z.object({
  id: idSchema,
  type: z.enum(['SKU', 'BUNDLE']),
  name: z.string().trim().min(1).max(200),
  includedSkuIds: z.array(idSchema).min(1),
  regularPrice: z.number().nonnegative(),
  campaignPrice: z.number().nonnegative().optional(),
  currency: z.literal('USD'),
  state: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']),
}).superRefine((offer, context) => {
  if (offer.type === 'SKU' && offer.includedSkuIds.length !== 1) {
    context.addIssue({ code: 'custom', path: ['includedSkuIds'], message: 'SKU offers include exactly one SKU' });
  }
  if (offer.campaignPrice !== undefined && offer.campaignPrice > offer.regularPrice) {
    context.addIssue({ code: 'custom', path: ['campaignPrice'], message: 'Campaign price cannot exceed regular price' });
  }
});

export const legacyMappingSchema = z.object({
  legacyWatchfaceId: z.string().trim().min(1).max(160),
  productModelId: idSchema,
  skuId: idSchema,
  technicalPackageId: idSchema,
  migrationState: z.enum(['TEMPORARY', 'REVIEWED', 'CONSOLIDATED']),
});

export type WorkshopProject = z.infer<typeof workshopProjectSchema>;
export type WorkshopBuild = z.infer<typeof workshopBuildSchema>;
export type DesignDna = z.infer<typeof designDnaSchema>;
export type StoreCollection = z.infer<typeof collectionSchema>;
export type ProductModel = z.infer<typeof productModelSchema>;
export type Sku = z.infer<typeof skuSchema>;
export type Device = z.infer<typeof deviceSchema>;
export type TechnicalTarget = z.infer<typeof technicalTargetSchema>;
export type TechnicalPackage = z.infer<typeof technicalPackageSchema>;
export type Offer = z.infer<typeof offerSchema>;
export type LegacyMapping = z.infer<typeof legacyMappingSchema>;

export interface LegacyDeviceEntry {
  name: string;
  brand: string;
  specGroup: string;
  deviceSources?: number[];
}

/** Existing models.json is a physical-device catalog. New domain code uses Device terminology. */
export type LegacyDeviceCatalog = Record<string, LegacyDeviceEntry>;

export interface LegacyCatalogEntryLike {
  id: string;
  name: string;
  specGroup: string;
  categories: string[];
  hashtags: string[];
  basePrice?: number;
  discountPercent?: number;
  price: number;
  createdAt: string;
  zpkPath: string;
}

export interface LegacyCatalogAdaptation {
  productModel: ProductModel;
  sku: Sku;
  technicalTarget: TechnicalTarget;
  technicalPackage: TechnicalPackage;
  offer: Offer;
  mapping: LegacyMapping;
}

export interface StoreArchitectureFlags {
  workshop: boolean;
  productHierarchy: boolean;
  releaseRepack: boolean;
  storefrontReadModel: boolean;
  offerCheckout: boolean;
}

function flagEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

export function resolveStoreArchitectureFlags(env: Record<string, string | undefined>): StoreArchitectureFlags {
  return {
    workshop: flagEnabled(env.VITE_STORE_WORKSHOP_ENABLED),
    productHierarchy: flagEnabled(env.VITE_STORE_PRODUCT_HIERARCHY_ENABLED),
    releaseRepack: flagEnabled(env.VITE_STORE_RELEASE_REPACK_ENABLED),
    storefrontReadModel: flagEnabled(env.VITE_STORE_READ_MODEL_ENABLED),
    offerCheckout: flagEnabled(env.VITE_STORE_OFFER_CHECKOUT_ENABLED),
  };
}

export const storeArchitectureFlags = resolveStoreArchitectureFlags(import.meta.env);

export function normalizeIdentity(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function canonicalSlug(value: string, fallback = 'untitled'): string {
  return normalizeIdentity(value).replace(/\s+/g, '-') || fallback;
}

export function canonicalCodeSegment(value: string, fallback = 'NA'): string {
  const segment = normalizeIdentity(value).replace(/\s+/g, '').toUpperCase();
  return segment || fallback;
}

export function buildCanonicalCustomerName(input: {
  modelName: string;
  variantName?: string;
  editionName?: string;
}): string {
  return [`FlowVault ${input.modelName.trim()}`, input.variantName?.trim(), input.editionName?.trim()]
    .filter((part): part is string => Boolean(part))
    .join(' — ');
}

export function buildInternalProductCode(input: {
  collectionCode: string;
  modelNumber: number;
  variantCode?: string;
  editionCode?: string;
  technicalTargetCode: string;
  revision: string;
}): string {
  const revision = input.revision.trim();
  if (!revisionPattern.test(revision)) throw new Error(`Invalid revision: ${revision}`);
  const parts = [
    'FVL',
    canonicalCodeSegment(input.collectionCode),
    String(input.modelNumber).padStart(3, '0'),
    input.variantCode ? canonicalCodeSegment(input.variantCode) : undefined,
    input.editionCode ? canonicalCodeSegment(input.editionCode) : undefined,
    canonicalCodeSegment(input.technicalTargetCode),
    revision,
  ].filter((part): part is string => Boolean(part));
  return parts.join('-');
}

function safePathId(value: string): string {
  return idSchema.parse(value);
}

export function buildWorkshopStoragePaths(projectId: string, buildNumber: number) {
  const safeProjectId = safePathId(projectId);
  if (!Number.isInteger(buildNumber) || buildNumber < 1) throw new Error('Build number must be a positive integer');
  const root = `workshop/${safeProjectId}/builds/${String(buildNumber).padStart(4, '0')}`;
  return {
    root,
    fvwf: `${root}/project.fvwf`,
    zpk: `${root}/test.zpk`,
    mainPreview: `${root}/preview-main.png`,
    aodPreview: `${root}/preview-aod.png`,
  };
}

export function buildReleaseStoragePaths(
  skuId: string,
  technicalTargetId: string,
  revision: string,
) {
  const safeSkuId = safePathId(skuId);
  const safeTargetId = safePathId(technicalTargetId);
  if (!revisionPattern.test(revision)) throw new Error(`Invalid revision: ${revision}`);
  const root = `releases/${safeSkuId}/${safeTargetId}/${revision}`;
  return {
    root,
    zpk: `${root}/face.zpk`,
    parityReport: `${root}/parity-report.json`,
  };
}

export function adaptLegacyDeviceCatalog(models: LegacyDeviceCatalog): Device[] {
  return Object.entries(models).map(([legacyModelSlug, model]) => ({
    id: canonicalSlug(legacyModelSlug),
    name: model.name,
    brand: model.brand,
    technicalTargetId: canonicalSlug(model.specGroup),
    legacyModelSlug,
  }));
}

export function adaptLegacyCatalogEntry(entry: LegacyCatalogEntryLike): LegacyCatalogAdaptation {
  const baseId = `legacy-${canonicalSlug(entry.id)}`;
  const productModelId = `${baseId}-model`;
  const skuId = `${baseId}-sku`;
  const technicalTargetId = canonicalSlug(entry.specGroup || 'unknown');
  const technicalPackageId = `${baseId}-${technicalTargetId}-v1-0`;
  const collectionId = 'legacy-imports';
  const createdAt = isoDateSchema.safeParse(entry.createdAt).success
    ? entry.createdAt
    : new Date(0).toISOString();
  const regularPrice = Math.max(0, entry.basePrice ?? entry.price);
  const resolutionMatch = entry.specGroup.match(/(\d{3,4})(?:x\d{3,4})?/i);
  const resolutionSize = resolutionMatch?.[1] ?? '1';
  const shape = entry.specGroup.toLowerCase().includes('round') ? 'round' : 'square';
  const supportedConfigVersions = entry.specGroup.toLowerCase().includes('v3')
    ? (['v3'] as const)
    : (['v2'] as const);

  return {
    productModel: {
      id: productModelId,
      collectionId,
      modelNumber: 1,
      name: entry.name || entry.id,
      code: `LEGACY-${canonicalCodeSegment(entry.id)}`,
      slug: canonicalSlug(entry.name || entry.id),
      defaultSkuId: skuId,
      categories: entry.categories,
      tags: entry.hashtags,
      state: 'DRAFT',
    },
    sku: {
      id: skuId,
      productModelId,
      variant: { id: 'default', name: 'Default', code: 'DF' },
      canonicalName: entry.name || entry.id,
      state: 'DRAFT',
    },
    technicalTarget: {
      id: technicalTargetId,
      code: canonicalCodeSegment(entry.specGroup),
      specGroup: entry.specGroup || 'unknown',
      resolution: `${resolutionSize}x${resolutionSize}`,
      shape,
      supportedConfigVersions: [...supportedConfigVersions],
    },
    technicalPackage: {
      id: technicalPackageId,
      skuId,
      technicalTargetId,
      revision: 'v1.0',
      internalCode: `FVL-LEGACY-${canonicalCodeSegment(entry.id)}-${canonicalCodeSegment(entry.specGroup)}-v1.0`,
      state: 'READY',
      approvedWorkshopBuildId: 'legacy-import',
      approvedZpkPath: entry.zpkPath,
      releasedZpkPath: entry.zpkPath,
      parityReportPath: `legacy/${canonicalSlug(entry.id)}/not-applicable.json`,
      embeddedCanonicalName: entry.name || entry.id,
      hashes: {},
      createdAt,
    },
    offer: {
      id: `${baseId}-offer`,
      type: 'SKU',
      name: entry.name || entry.id,
      includedSkuIds: [skuId],
      regularPrice,
      campaignPrice: entry.price < regularPrice ? entry.price : undefined,
      currency: 'USD',
      state: 'DRAFT',
    },
    mapping: {
      legacyWatchfaceId: entry.id,
      productModelId,
      skuId,
      technicalPackageId,
      migrationState: 'TEMPORARY',
    },
  };
}
