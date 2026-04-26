export type InvestigationIssueFocus = 'engrave' | 'pointer' | 'both';

export type InvestigationStage =
  | 'fixture_setup'
  | 'preview'
  | 'export'
  | 'extraction'
  | 'device'
  | 'synthesis';

export type InvestigationRunStatus = 'in_progress' | 'completed' | 'invalidated';

export interface InvestigationEventPayload {
  capturePoint:
    | 'fixture_snapshot'
    | 'preview_metrics'
    | 'export_manifest'
    | 'extraction_checks'
    | 'device_observation'
    | 'verdict_synthesis';
  data: Record<string, unknown>;
}

export interface InvestigationInstrumentationEvent {
  eventId: string;
  runId: string;
  stage: InvestigationStage;
  eventType: string;
  eventTs: string;
  fixtureId: string;
  buildHash: string;
  payload: InvestigationEventPayload;
}

export interface InvestigationRunCapture {
  runId: string;
  featureId: '032-device-parity-root-cause';
  fixtureId: string;
  issueFocus: InvestigationIssueFocus;
  buildHash: string;
  operator: string;
  startedAt: string;
  completedAt?: string;
  runStatus: InvestigationRunStatus;
  invalidationReason?: string;
}

export const INVESTIGATION_EVENT_STORAGE_KEY = 'wf.parity.investigation.events.v1';
export const INVESTIGATION_RUN_STORAGE_KEY = 'wf.parity.investigation.runs.v1';
export const INVESTIGATION_FEATURE_ID = '032-device-parity-root-cause';
