import { generateWatchFaceCode } from '@/lib/jsCodeGenerator';
import type { ProjectFileArtifact } from '@/lib/projectFileArtifact';
import type { GeneratedCode, WatchFaceConfig, WatchFaceElement } from '@/types';
import {
  validateComposerProject,
  type ComposerSlot,
  type FvwcProjectV1,
} from './composerDomain';
import { assignGeneratedDigitPaths } from './digitAssetPreparation';

export interface EditableAssetSource {
  path: string;
  dataUrl: string;
}

export interface EditableV2VariantPlan {
  id: string;
  typeId: number;
  title: string;
  previewPath: string;
  elements: WatchFaceElement[];
  aodElements: WatchFaceElement[];
}

export interface EditableV2SlotPlan {
  id: string;
  editId: number;
  defaultTypeId: number;
  bounds: ComposerSlot['bounds'];
  selectImagePath: string;
  unselectImagePath: string;
  variants: EditableV2VariantPlan[];
}

export interface EditableV2Plan {
  projectId: string;
  name: string;
  baseConfig: WatchFaceConfig;
  packagingConfig: WatchFaceConfig;
  slot: EditableV2SlotPlan;
  assets: EditableAssetSource[];
  generatedCode: GeneratedCode;
  aodPolicy: 'FOLLOW_VARIANT_AOD' | 'FIXED_BASE_AOD';
}

const FIRST_CUSTOM_EDIT_TYPE = 100000;
const SUPPORTED_FIRST_SLICE_TYPES = new Set([
  'TEXT',
  'TEXT_IMG',
  'IMG',
  'IMG_STATUS',
  'IMG_LEVEL',
  'IMG_PROGRESS',
  'IMG_DATE',
  'IMG_TIME',
  'IMG_WEEK',
  'ARC_PROGRESS',
]);

function deterministicNumber(value: string, min: number, span: number): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return min + ((hash >>> 0) % span);
}

function safeSegment(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
    || 'asset';
}

function dataUrlExtension(value: string): string {
  const mime = /^data:([^;,]+)/.exec(value)?.[1]?.toLowerCase();
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/svg+xml') return 'svg';
  return 'png';
}

interface NamespaceResult {
  elements: WatchFaceElement[];
  assets: EditableAssetSource[];
}

function namespaceVariantElements(
  elements: WatchFaceElement[],
  variantId: string,
): NamespaceResult {
  const namespace = `editable/${safeSegment(variantId)}`;
  const assets: EditableAssetSource[] = [];
  let assetCounter = 0;

  const mapAsset = (value: string | undefined, label: string): string | undefined => {
    if (!value) return value;
    if (!value.startsWith('data:')) return value;
    const path = `${namespace}/${safeSegment(label)}_${assetCounter}.${dataUrlExtension(value)}`;
    assetCounter += 1;
    assets.push({ path, dataUrl: value });
    return path;
  };

  const nextElements = elements.map((element, elementIndex) => {
    const next: WatchFaceElement = structuredClone(element);
    next.id = `${variantId}__${element.id}`;
    const src = mapAsset(next.src, next.assetFilename || next.name || `element_${elementIndex}`);
    next.src = src;
    if (src && !src.startsWith('data:')) next.assetFilename = src;
    next.hourHandSrc = mapAsset(next.hourHandSrc, `hour_${elementIndex}`);
    next.minuteHandSrc = mapAsset(next.minuteHandSrc, `minute_${elementIndex}`);
    next.secondHandSrc = mapAsset(next.secondHandSrc, `second_${elementIndex}`);
    next.coverSrc = mapAsset(next.coverSrc, `cover_${elementIndex}`);
    next.pressSrc = mapAsset(next.pressSrc, `press_${elementIndex}`);
    next.normalSrc = mapAsset(next.normalSrc, `normal_${elementIndex}`);
    next.images = next.images?.map((value, imageIndex) => mapAsset(value, `frame_${elementIndex}_${imageIndex}`) ?? value);
    next.fontArray = next.fontArray?.map((value, imageIndex) => mapAsset(value, `font_${elementIndex}_${imageIndex}`) ?? value);
    return next;
  });
  return { elements: nextElements, assets };
}

function hydrateVariantBackground(
  elements: WatchFaceElement[],
  source: ProjectFileArtifact,
): WatchFaceElement[] {
  const embeddedBackground = source.backgroundImage;
  const configuredPath = source.watchFaceConfig.background.src;
  if (!embeddedBackground?.startsWith('data:')) return elements;

  return elements.map((element) => {
    if (
      element.type !== 'IMG'
      || (element.src !== configuredPath && element.assetFilename !== configuredPath)
    ) {
      return element;
    }
    return {
      ...structuredClone(element),
      src: embeddedBackground,
      assetFilename: undefined,
    };
  });
}

function extractNormalComposition(runtime: string, includeBackground: boolean): string {
  const startMarker = includeBackground
    ? '// ========== NORMAL MODE BACKGROUND =========='
    : '// ========== NORMAL MODE WIDGETS ==========';
  const endMarker = '// ========== AOD MODE BACKGROUND ==========';
  const start = runtime.indexOf(startMarker);
  const end = runtime.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error('Unable to extract current V2 widget block.');
  return runtime.slice(start + startMarker.length, end).trim();
}

function extractAodComposition(runtime: string): string {
  const startMarker = '// ========== AOD MODE BACKGROUND ==========';
  const endMarker = '// Widget delegate for lifecycle management';
  const start = runtime.indexOf(startMarker);
  const end = runtime.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error('Unable to extract current V2 AOD widget block.');
  return runtime.slice(start + startMarker.length, end).trim();
}

function editableRuntimeBlock(slot: EditableV2SlotPlan, baseConfig: WatchFaceConfig): string {
  const optionalTypes = slot.variants.map((variant) => `{
                        type: ${variant.typeId},
                        preview: '${variant.previewPath}',
                        title_sc: '${variant.title}',
                        title_tc: '${variant.title}',
                        title_en: '${variant.title}'
                    }`).join(',\n                    ');
  const branches = slot.variants.map((variant) => {
    const variantBackground = variant.elements.find((element) => (
      element.type === 'IMG'
      && element.bounds.x === 0
      && element.bounds.y === 0
      && element.bounds.width === baseConfig.resolution.width
      && element.bounds.height === baseConfig.resolution.height
    ));
    const variantConfig: WatchFaceConfig = {
      name: variant.title,
      watchModel: baseConfig.watchModel,
      resolution: baseConfig.resolution,
      background: {
        src: variantBackground?.src ?? 'background.png',
        format: 'TGA-P',
      },
      elements: variant.elements,
      aodElements: variant.aodElements,
      aodBackgroundMode: variant.aodElements.length > 0 ? 'NONE_BLACK' : undefined,
    };
    let widgetCode = extractNormalComposition(
      generateWatchFaceCode(variantConfig).watchfaceIndexJs,
      Boolean(variantBackground),
    );
    if (variantBackground?.src) {
      widgetCode = widgetCode.replace("src: 'background.png'", `src: '${variantBackground.src}'`);
    }
    if (variant.aodElements.length > 0) {
      widgetCode += `\n                        ${extractAodComposition(
        generateWatchFaceCode(variantConfig).watchfaceIndexJs,
      )}`;
    }
    return `case ${variant.typeId}: {
                        ${widgetCode}
                        break;
                    }`;
  }).join('\n                    ');

  return `
                // ========== SYSTEM B EDITABLE V2 SLOT ==========
                const editableGroup_${slot.editId} = hmUI.createWidget(hmUI.widget.WATCHFACE_EDIT_GROUP, {
                    edit_id: ${slot.editId},
                    x: px(${slot.bounds.x}),
                    y: px(${slot.bounds.y}),
                    w: px(${slot.bounds.width}),
                    h: px(${slot.bounds.height}),
                    select_image: '${slot.selectImagePath}',
                    un_select_image: '${slot.unselectImagePath}',
                    default_type: ${slot.defaultTypeId},
                    optional_types: [
                    ${optionalTypes}
                    ],
                    count: ${slot.variants.length},
                    select_list: {
                        title_font_size: 34,
                        title_align_h: hmUI.align.CENTER_H,
                        list_item_vspace: 8,
                        list_tips_text_font_size: 32,
                        list_tips_text_align_h: hmUI.align.LEFT
                    }
                });
                const editableType_${slot.editId} = editableGroup_${slot.editId}.getProperty(hmUI.prop.CURRENT_TYPE);
                switch (editableType_${slot.editId}) {
                    ${branches}
                }
`;
}

function injectEditableBlock(runtime: string, block: string, width: number, height: number): string {
  const marker = '// ========== NORMAL MODE WIDGETS ==========';
  const index = runtime.indexOf(marker);
  if (index < 0) throw new Error('Current V2 runtime marker is missing.');
  const insertionPoint = index + marker.length;
  return `${runtime.slice(0, insertionPoint)}
${block
  .replaceAll('__SYSTEM_B_WIDTH__', String(width))
  .replaceAll('__SYSTEM_B_HEIGHT__', String(height))}
${runtime.slice(insertionPoint)}`;
}

export function compileEditableV2Plan(
  project: FvwcProjectV1,
  variantPreviewDataUrls: Record<string, string> = {},
): EditableV2Plan {
  const errors = validateComposerProject(project).filter((issue) => issue.severity === 'ERROR');
  if (errors.length > 0) throw new Error(errors.map((issue) => issue.message).join(' '));
  if (project.slots.length !== 1) {
    throw new Error('The first editable V2 slice requires exactly one slot.');
  }
  const baseSource = project.sourceBuilds.find((source) => source.id === project.baseBuildId);
  if (!baseSource) throw new Error('The base source is missing.');
  const slot = project.slots[0];
  if (slot.variants.length < 2 || slot.variants.length > 3) {
    throw new Error('The first editable V2 slice requires two or three variants.');
  }
  const followVariantAod = slot.variants.every((variant) => {
    const source = project.sourceBuilds.find((item) => item.id === variant.sourceBuildId);
    return Boolean(source?.artifact.watchFaceConfig.aodElements?.length);
  });

  const ownedBaseLayerIds = new Set(
    slot.variants.flatMap((variant) => {
      const group = project.componentGroups.find((item) => item.id === variant.componentGroupId);
      return group?.sourceBuildId === baseSource.id ? group.layerIds : [];
    }),
  );
  const rawBaseConfig: WatchFaceConfig = {
    ...structuredClone(baseSource.artifact.watchFaceConfig),
    name: `${project.name} Editable`,
    elements: baseSource.artifact.watchFaceConfig.elements
      .filter((element) => !ownedBaseLayerIds.has(element.id)),
  };

  const assets: EditableAssetSource[] = [];
  const fixedMain = namespaceVariantElements(
    assignGeneratedDigitPaths(rawBaseConfig.elements, 'editable/fixed_base/generated'),
    'fixed_base',
  );
  assets.push(...fixedMain.assets);
  const fixedAod = namespaceVariantElements(
    assignGeneratedDigitPaths(rawBaseConfig.aodElements ?? [], 'editable/fixed_aod/generated'),
    'fixed_aod',
  );
  assets.push(...fixedAod.assets);
  const baseConfig: WatchFaceConfig = {
    ...rawBaseConfig,
    elements: fixedMain.elements,
    aodElements: followVariantAod
      ? []
      : (rawBaseConfig.aodElements ? fixedAod.elements : rawBaseConfig.aodElements),
    ...(followVariantAod ? { aodBackgroundMode: 'NONE_BLACK' as const } : {}),
  };
  const variants: EditableV2VariantPlan[] = slot.variants.map((variant, index) => {
    const group = project.componentGroups.find((item) => item.id === variant.componentGroupId);
    const source = project.sourceBuilds.find((item) => item.id === variant.sourceBuildId);
    if (!group || !source) throw new Error(`${variant.name} has a broken source group.`);
    const originalElements = hydrateVariantBackground(
      source.artifact.watchFaceConfig.elements
        .filter((element) => group.layerIds.includes(element.id)),
      source.artifact,
    );
    const unsupported = originalElements.filter((element) => !SUPPORTED_FIRST_SLICE_TYPES.has(element.type));
    if (unsupported.length > 0) {
      throw new Error(`${variant.name} contains unsupported first-slice types: ${unsupported.map((element) => element.type).join(', ')}.`);
    }
    const namespaced = namespaceVariantElements(
      assignGeneratedDigitPaths(originalElements, `editable/${safeSegment(variant.id)}/generated`),
      variant.id,
    );
    assets.push(...namespaced.assets);
    const namespacedAod = followVariantAod
      ? namespaceVariantElements(
        assignGeneratedDigitPaths(
          source.artifact.watchFaceConfig.aodElements ?? [],
          `editable/${safeSegment(variant.id)}/aod/generated`,
        ),
        `${variant.id}_aod`,
      )
      : { elements: [], assets: [] };
    assets.push(...namespacedAod.assets);
    const previewDataUrl = variantPreviewDataUrls[variant.id] || source.artifact.backgroundImage;
    if (!previewDataUrl?.startsWith('data:')) {
      throw new Error(`${variant.name} requires an embedded FVWF preview/background for its edit preview.`);
    }
    const previewPath = `editable/${safeSegment(variant.id)}/preview.png`;
    assets.push({ path: previewPath, dataUrl: previewDataUrl });
    return {
      id: variant.id,
      typeId: FIRST_CUSTOM_EDIT_TYPE + index,
      title: variant.name,
      previewPath,
      elements: namespaced.elements,
      aodElements: namespacedAod.elements,
    };
  });
  const slotPlan: EditableV2SlotPlan = {
    id: slot.id,
    editId: deterministicNumber(slot.id, 100, 9000),
    defaultTypeId: FIRST_CUSTOM_EDIT_TYPE + Math.max(0, slot.variants.findIndex((variant) => variant.id === slot.defaultVariantId)),
    bounds: slot.bounds,
    selectImagePath: `editable/${safeSegment(slot.id)}/select.png`,
    unselectImagePath: `editable/${safeSegment(slot.id)}/unselect.png`,
    variants,
  };
  const normalCode = generateWatchFaceCode(baseConfig);
  const appJson = JSON.parse(normalCode.appJson) as {
    module?: { watchface?: { editable?: number } };
  };
  if (!appJson.module?.watchface) throw new Error('Current V2 watchface manifest is missing.');
  appJson.module.watchface.editable = 1;
  const block = editableRuntimeBlock(slotPlan, baseConfig);
  const watchfaceIndexJs = injectEditableBlock(
    normalCode.watchfaceIndexJs,
    block,
    baseConfig.resolution.width,
    baseConfig.resolution.height,
  );
  const packagingElements = [
    ...baseConfig.elements,
    ...variants.flatMap((variant) => variant.elements),
  ];
  const packagingAodElements = followVariantAod
    ? variants.flatMap((variant) => variant.aodElements)
    : baseConfig.aodElements;
  return {
    projectId: project.id,
    name: baseConfig.name,
    baseConfig,
    packagingConfig: { ...baseConfig, elements: packagingElements, aodElements: packagingAodElements },
    slot: slotPlan,
    assets,
    generatedCode: {
      ...normalCode,
      appJson: JSON.stringify(appJson, null, 2),
      watchfaceIndexJs,
    },
    aodPolicy: followVariantAod ? 'FOLLOW_VARIANT_AOD' : 'FIXED_BASE_AOD',
  };
}
