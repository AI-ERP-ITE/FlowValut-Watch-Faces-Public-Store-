import type {
  AnalysisLayer,
  AnalysisLayerModel,
  AnalysisRequirementsModel,
  LayerRole,
} from '@/types/analysisCompiler';

export const CANONICAL_LAYER_ROLES: LayerRole[] = [
  'background',
  'texture_base',
  'decorative_base',
  'dial_markers',
  'complications',
  'hands',
  'hand_cover',
  'foreground_fx',
];

export interface LayerSequenceValidationResult {
  isValid: boolean;
  missingRoles: string[];
  orderErrors: string[];
  dependencyErrors: string[];
  zIndexErrors: string[];
  contentErrors: string[];
}

function countElementsByType(layer: AnalysisLayer): Map<string, number> {
  const counts = new Map<string, number>();
  for (const element of layer.elements) {
    const nextCount = (counts.get(element.type) ?? 0) + 1;
    counts.set(element.type, nextCount);
  }
  return counts;
}

function validateMustContainRules(layer: AnalysisLayer): string[] {
  const issues: string[] = [];
  const typeCounts = countElementsByType(layer);

  for (const rule of layer.mustContain) {
    const actual = typeCounts.get(rule.elementType) ?? 0;
    if (rule.minCount !== undefined && actual < rule.minCount) {
      issues.push(
        `Layer '${layer.id}' requires at least ${rule.minCount} '${rule.elementType}', found ${actual}`,
      );
    }
    if (rule.maxCount !== undefined && actual > rule.maxCount) {
      issues.push(
        `Layer '${layer.id}' allows at most ${rule.maxCount} '${rule.elementType}', found ${actual}`,
      );
    }
  }

  return issues;
}

export function validateLayerSequence(
  layerModel: AnalysisLayerModel,
  requirementsModel?: AnalysisRequirementsModel,
): LayerSequenceValidationResult {
  const missingRoles: string[] = [];
  const orderErrors: string[] = [];
  const dependencyErrors: string[] = [];
  const zIndexErrors: string[] = [];
  const contentErrors: string[] = [];

  const stack = layerModel.layerStack;
  const idToLayer = new Map<string, AnalysisLayer>();
  const idToIndex = new Map<string, number>();
  const usedZIndexes = new Set<number>();

  for (let index = 0; index < stack.length; index += 1) {
    const layer = stack[index];
    idToLayer.set(layer.id, layer);
    idToIndex.set(layer.id, index);

    if (usedZIndexes.has(layer.zIndex)) {
      zIndexErrors.push(`Duplicate zIndex ${layer.zIndex} on layer '${layer.id}'`);
    }
    usedZIndexes.add(layer.zIndex);

    if (index > 0 && stack[index - 1].zIndex >= layer.zIndex) {
      zIndexErrors.push(
        `Layer stack not strictly increasing by zIndex between '${stack[index - 1].id}' and '${layer.id}'`,
      );
    }

    contentErrors.push(...validateMustContainRules(layer));
  }

  for (const requiredRole of CANONICAL_LAYER_ROLES) {
    if (!stack.some(layer => layer.role === requiredRole)) {
      missingRoles.push(`Missing required layer role '${requiredRole}'`);
    }
  }

  for (const layer of stack) {
    for (const dependencyId of layer.dependsOn) {
      const dependency = idToLayer.get(dependencyId);
      if (!dependency) {
        dependencyErrors.push(`Layer '${layer.id}' depends on missing layer '${dependencyId}'`);
        continue;
      }

      const dependencyIndex = idToIndex.get(dependency.id) ?? -1;
      const layerIndex = idToIndex.get(layer.id) ?? -1;
      if (dependencyIndex >= layerIndex) {
        orderErrors.push(
          `Layer '${layer.id}' depends on '${dependency.id}' but appears before/equal in stack order`,
        );
      }

      if (dependency.zIndex >= layer.zIndex) {
        zIndexErrors.push(
          `Layer '${layer.id}' depends on '${dependency.id}' but zIndex ${dependency.zIndex} is not below ${layer.zIndex}`,
        );
      }
    }
  }

  if (requirementsModel) {
    const globalTypeCounts = new Map<string, number>();
    for (const layer of stack) {
      for (const element of layer.elements) {
        globalTypeCounts.set(element.type, (globalTypeCounts.get(element.type) ?? 0) + 1);
      }
    }

    for (const req of requirementsModel.requiredElements) {
      const actual = globalTypeCounts.get(req.elementType) ?? 0;
      if (actual < req.minCount) {
        contentErrors.push(
          `Global requirement needs at least ${req.minCount} '${req.elementType}', found ${actual}`,
        );
      }
      if (req.maxCount !== undefined && actual > req.maxCount) {
        contentErrors.push(
          `Global requirement allows at most ${req.maxCount} '${req.elementType}', found ${actual}`,
        );
      }
    }
  }

  const isValid =
    missingRoles.length === 0 &&
    orderErrors.length === 0 &&
    dependencyErrors.length === 0 &&
    zIndexErrors.length === 0 &&
    contentErrors.length === 0;

  return {
    isValid,
    missingRoles,
    orderErrors,
    dependencyErrors,
    zIndexErrors,
    contentErrors,
  };
}
