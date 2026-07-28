import type { ProjectFileArtifact } from '@/lib/projectFileArtifact';
import type { CustomHandRecord } from '@/lib/customHandStore';
import type { WatchFaceElement } from '@/types';

const CUSTOM_HAND_PREFIX = 'custom_hand:';

export function mergeCustomHandRecords(
  ...collections: Array<readonly CustomHandRecord[] | undefined>
): CustomHandRecord[] {
  const records = new Map<string, CustomHandRecord>();
  for (const collection of collections) {
    for (const record of collection ?? []) records.set(record.key, record);
  }
  return [...records.values()].sort((a, b) => a.createdAt - b.createdAt);
}

function hydratePointer(
  element: WatchFaceElement,
  records: ReadonlyMap<string, CustomHandRecord>,
): WatchFaceElement {
  if (element.type !== 'TIME_POINTER' || !element.handStyle?.startsWith(CUSTOM_HAND_PREFIX)) {
    return element;
  }
  const record = records.get(element.handStyle);
  if (!record) {
    throw new Error(
      `Custom pointer "${element.handStyle}" is not available. Open/save that hand pack in System A on this browser, then import the FVWF again.`,
    );
  }
  return {
    ...element,
    hourHandSrc: record.hourDataUrl,
    minuteHandSrc: record.minuteDataUrl,
    secondHandSrc: record.secondDataUrl,
    coverSrc: record.coverDataUrl,
    coverWidth: record.coverWidth ?? element.coverWidth,
    coverHeight: record.coverHeight ?? element.coverHeight,
    hourPos: Number.isFinite(record.hourPosX) && Number.isFinite(record.hourPosY)
      ? { x: record.hourPosX!, y: record.hourPosY! }
      : element.hourPos,
    minutePos: Number.isFinite(record.minutePosX) && Number.isFinite(record.minutePosY)
      ? { x: record.minutePosX!, y: record.minutePosY! }
      : element.minutePos,
    secondPos: Number.isFinite(record.secondPosX) && Number.isFinite(record.secondPosY)
      ? { x: record.secondPosX!, y: record.secondPosY! }
      : element.secondPos,
  };
}

export function hydrateArtifactCustomHands(
  artifact: ProjectFileArtifact,
  customHands: readonly CustomHandRecord[],
): { artifact: ProjectFileArtifact; referencedHands: CustomHandRecord[] } {
  const records = new Map(customHands.map((record) => [record.key, record]));
  const referencedKeys = new Set<string>();
  const hydrate = (
    elements: WatchFaceElement[] | null | undefined,
  ): WatchFaceElement[] | null | undefined =>
    elements?.map((element) => {
      if (element.type === 'TIME_POINTER' && element.handStyle?.startsWith(CUSTOM_HAND_PREFIX)) {
        referencedKeys.add(element.handStyle);
      }
      return hydratePointer(element, records);
    });

  return {
    artifact: {
      ...artifact,
      watchFaceConfig: {
        ...artifact.watchFaceConfig,
        elements: hydrate(artifact.watchFaceConfig.elements) ?? [],
        aodElements: hydrate(artifact.watchFaceConfig.aodElements),
      },
    },
    referencedHands: [...referencedKeys].map((key) => records.get(key)!),
  };
}
