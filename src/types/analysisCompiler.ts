export type LayerRole =
  | 'background'
  | 'texture_base'
  | 'decorative_base'
  | 'dial_markers'
  | 'complications'
  | 'hands'
  | 'hand_cover'
  | 'foreground_fx';

export interface AnalysisRequirementsModel {
  requiredElements: Array<{
    elementType: string;
    minCount: number;
    maxCount?: number;
  }>;
  watchResolution?: {
    width: number;
    height: number;
  };
}

export interface AnalysisGeometryModel {
  canvas: {
    width: number;
    height: number;
  };
  elements: Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    centerX?: number;
    centerY?: number;
  }>;
}

export interface LayerContainmentRule {
  elementType: string;
  minCount?: number;
  maxCount?: number;
}

export interface AnalysisLayer {
  id: string;
  role: LayerRole;
  zIndex: number;
  dependsOn: string[];
  clipRefs: string[];
  mustContain: LayerContainmentRule[];
  elements: Array<{
    id: string;
    type: string;
  }>;
}

export interface AnalysisLayerModel {
  layerStack: AnalysisLayer[];
}

export interface AnalysisLightingModel {
  globalLightDirectionDeg?: number;
  highlights: Array<{
    elementId: string;
    intensity: number;
  }>;
  shadows: Array<{
    elementId: string;
    intensity: number;
  }>;
}

export interface AnalysisColorModel {
  palette: string[];
  dominantColor?: string;
  contrastPairs: Array<{
    fg: string;
    bg: string;
    ratio?: number;
  }>;
}

export interface AnalysisTextureModel {
  materials: Array<{
    id: string;
    elementId: string;
    materialType: string;
    roughness?: number;
    metallic?: number;
  }>;
}

export interface AnalysisComplianceHints {
  notes: string[];
  riskyZones: Array<{
    layerId: string;
    reason: string;
  }>;
}

export interface WatchfaceAnalysisContract {
  requirementsModel: AnalysisRequirementsModel;
  geometryModel: AnalysisGeometryModel;
  layerModel: AnalysisLayerModel;
  lightingModel: AnalysisLightingModel;
  colorModel: AnalysisColorModel;
  textureModel: AnalysisTextureModel;
  complianceHints: AnalysisComplianceHints;
}

export type ComplianceGateStatus = 'PASS' | 'FAIL';

export interface ComplianceGateResult {
  gateId: string;
  title: string;
  status: ComplianceGateStatus;
  details: string[];
}

export interface ComplianceValidationReport {
  isCompliant: boolean;
  gates: ComplianceGateResult[];
}
