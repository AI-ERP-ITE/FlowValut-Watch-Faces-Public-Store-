# Spec 122 — Data Model

## WorkshopProject

```ts
interface WorkshopProject {
  id: string;
  workingTitle: string;
  folder?: string;
  notes?: string;
  tags: string[];
  targetDeviceId?: string;
  currentBuildId?: string;
  promotedProductModelId?: string;
  buildCount: number;
  storageBytes: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}
```

## WorkshopBuild

```ts
interface WorkshopBuild {
  id: string;
  projectId: string;
  buildNumber: number;
  workshopLabel: string;
  parentBuildId?: string;
  state: 'TESTING' | 'APPROVED' | 'PROMOTED' | 'TRASHED';
  fvwfPath: string;
  zpkPath: string;
  mainPreviewPath?: string;
  aodPreviewPath?: string;
  specGroup?: string;
  deviceId?: string;
  resolution: { width: number; height: number };
  notes?: string;
  hashes: Record<string, string>;
  storageBytes: number;
  previousState?: string;
  deletedAt?: Timestamp;
  deletedBy?: string;
  createdAt: Timestamp;
  createdBy: string;
}
```

Storage layout:

```text
workshop/{projectId}/builds/{buildNumber}/project.fvwf
workshop/{projectId}/builds/{buildNumber}/test.zpk
workshop/{projectId}/builds/{buildNumber}/preview-main.png
workshop/{projectId}/builds/{buildNumber}/preview-aod.png
```

## Store hierarchy

```ts
interface DesignDna {
  id: string;
  name: string;
  code: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

interface Collection {
  id: string;
  designDnaId: string;
  name: string;
  code: string;
  slug: string;
  description?: string;
  status: 'DRAFT' | 'LIVE' | 'OFFLINE' | 'ARCHIVED';
}

interface ProductModel {
  id: string;
  collectionId: string;
  modelNumber: number;
  name: string;
  code: string;
  slug: string;
  description?: string;
  designStory?: string;
  defaultSkuId?: string;
  categories: string[];
  tags: string[];
  state: 'DRAFT' | 'READY' | 'LIVE' | 'OFFLINE' | 'ARCHIVED';
}

interface Sku {
  id: string;
  productModelId: string;
  variant: { id: string; name: string; code: string; swatch?: string; material?: string };
  edition?: { id: string; name: string; code: string };
  canonicalName: string;
  state: 'DRAFT' | 'READY' | 'LIVE' | 'OFFLINE' | 'ARCHIVED';
}
```

Variants and Editions may begin embedded in SKUs with stable IDs and immutable display snapshots. They may later become reusable collections if demonstrated reuse justifies it.

## Device and technical targets

```ts
interface Device {
  id: string;
  name: string;
  brand: string;
  technicalTargetId: string;
  legacyModelSlug?: string;
}

interface TechnicalTarget {
  id: string;          // e.g. 480R
  specGroup: string;   // e.g. 480-round-v2
  resolution: string;
  shape: 'round' | 'square';
  supportedConfigVersions: Array<'v2' | 'v3'>;
}
```

Existing `models.json` and `specGroups.json` remain compatibility inputs until migration is complete.

## TechnicalPackage

```ts
interface TechnicalPackage {
  id: string;
  skuId: string;
  technicalTargetId: string;
  revision: string;
  internalCode: string;
  state: 'BUILDING' | 'VALIDATING' | 'READY' | 'CURRENT' | 'SUPERSEDED' | 'FAILED' | 'TRASHED';
  approvedWorkshopBuildId: string;
  approvedZpkPath: string;
  releasedZpkPath: string;
  parityReportPath: string;
  embeddedCanonicalName: string;
  hashes: Record<string, string>;
  createdAt: Timestamp;
}
```

Storage layout:

```text
releases/{skuId}/{technicalTargetId}/{revision}/face.zpk
releases/{skuId}/{technicalTargetId}/{revision}/parity-report.json
```

## Offer and entitlement

```ts
interface Offer {
  id: string;
  type: 'SKU' | 'BUNDLE';
  name: string;
  includedSkuIds: string[];
  regularPrice: number;
  campaignPrice?: number;
  currency: 'USD';
  state: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
}

interface OrderEntitlementSnapshot {
  offerId: string;
  offerName: string;
  includedSkuIds: string[];
  amountPaid: number;
  currency: string;
  pricingSnapshot: Record<string, unknown>;
}
```

## LegacyMapping

```ts
interface LegacyMapping {
  legacyWatchfaceId: string;
  productModelId: string;
  skuId: string;
  technicalPackageId: string;
  migrationState: 'TEMPORARY' | 'REVIEWED' | 'CONSOLIDATED';
}
```

## Audit records

Release, lifecycle, restore, permanent deletion, migration, pricing, and entitlement changes write append-only audit records containing actor, timestamp, action, target IDs, previous state, next state, and result details.

