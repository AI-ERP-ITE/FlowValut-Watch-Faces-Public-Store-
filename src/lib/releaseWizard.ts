import { buildCanonicalCustomerName, buildInternalProductCode, canonicalSlug, normalizeIdentity } from './storeArchitecture';

export interface ReleaseWizardDraft {
  designDnaName: string; designDnaCode: string;
  collectionName: string; collectionCode: string;
  modelName: string; modelNumber: number;
  variantName: string; variantCode: string;
  editionName?: string; editionCode?: string;
  technicalTargetId: string; revision: string;
  regularPrice: number; campaignPrice?: number;
}

export function releaseWizardPreview(draft: ReleaseWizardDraft) {
  return {
    canonicalName: buildCanonicalCustomerName({ modelName: draft.modelName, variantName: draft.variantName, editionName: draft.editionName }),
    internalCode: buildInternalProductCode({ collectionCode: draft.collectionCode, modelNumber: draft.modelNumber, variantCode: draft.variantCode, editionCode: draft.editionCode, technicalTargetCode: draft.technicalTargetId, revision: draft.revision }),
    ids: {
      designDnaId: canonicalSlug(draft.designDnaName),
      collectionId: canonicalSlug(draft.collectionName),
      modelId: canonicalSlug(`${draft.collectionName}-${draft.modelName}`),
      skuId: canonicalSlug(`${draft.collectionName}-${draft.modelName}-${draft.variantName}-${draft.editionName ?? ''}`),
    },
  };
}

export function findNormalizedConflict(value: string, candidates: Array<{ id: string; name: string }>) {
  const identity = normalizeIdentity(value);
  return candidates.find((candidate) => normalizeIdentity(candidate.name) === identity) ?? null;
}

export function nextRevision(revisions: string[]): string {
  const parsed = revisions.map((revision) => /^v(\d+)\.(\d+)$/.exec(revision)).filter((match): match is RegExpExecArray => Boolean(match));
  if (parsed.length === 0) return 'v1.0';
  const latest = parsed.sort((a, b) => Number(b[1]) - Number(a[1]) || Number(b[2]) - Number(a[2]))[0];
  return `v${latest[1]}.${Number(latest[2]) + 1}`;
}
