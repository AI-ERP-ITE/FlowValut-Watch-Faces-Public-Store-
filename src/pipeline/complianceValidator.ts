import type {
  ComplianceGateResult,
  ComplianceValidationReport,
  WatchfaceAnalysisContract,
} from '@/types/analysisCompiler';
import { validateLayerSequence } from './layerSequenceValidator';

function makeGate(gateId: string, title: string, details: string[]): ComplianceGateResult {
  return {
    gateId,
    title,
    status: details.length === 0 ? 'PASS' : 'FAIL',
    details: details.length === 0 ? ['OK'] : details,
  };
}

export function validateAnalysisCompliance(
  analysis: WatchfaceAnalysisContract,
): ComplianceValidationReport {
  const schemaErrors: string[] = [];
  if (!analysis.requirementsModel) schemaErrors.push('requirementsModel is missing');
  if (!analysis.geometryModel) schemaErrors.push('geometryModel is missing');
  if (!analysis.layerModel) schemaErrors.push('layerModel is missing');
  if (!analysis.lightingModel) schemaErrors.push('lightingModel is missing');
  if (!analysis.colorModel) schemaErrors.push('colorModel is missing');
  if (!analysis.textureModel) schemaErrors.push('textureModel is missing');
  if (!analysis.complianceHints) schemaErrors.push('complianceHints is missing');

  const layerResult = validateLayerSequence(analysis.layerModel, analysis.requirementsModel);

  const gates: ComplianceGateResult[] = [
    makeGate('schema-presence', 'Contract Schema Presence', schemaErrors),
    makeGate('layer-roles', 'Required Layer Roles', layerResult.missingRoles),
    makeGate('layer-order', 'Layer Ordering', layerResult.orderErrors),
    makeGate('layer-dependencies', 'Layer Dependencies', layerResult.dependencyErrors),
    makeGate('layer-zindex', 'Layer zIndex Integrity', layerResult.zIndexErrors),
    makeGate('layer-content-counts', 'Layer Content Count Rules', layerResult.contentErrors),
  ];

  const isCompliant = gates.every(gate => gate.status === 'PASS');
  return { isCompliant, gates };
}
