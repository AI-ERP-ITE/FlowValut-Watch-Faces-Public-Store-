import {
  INVESTIGATION_EVENT_STORAGE_KEY,
  INVESTIGATION_FEATURE_ID,
  INVESTIGATION_RUN_STORAGE_KEY,
  type InvestigationInstrumentationEvent,
  type InvestigationIssueFocus,
  type InvestigationRunCapture,
  type InvestigationStage,
} from '@/types/parityInvestigation';

interface CreateSessionOptions {
  enabled: boolean;
  operator: string;
}

interface StartRunInput {
  fixtureId: string;
  issueFocus: InvestigationIssueFocus;
  buildHash: string;
}

interface StartRunResult {
  run: InvestigationRunCapture;
}

interface CaptureStageInput {
  runId: string;
  fixtureId: string;
  buildHash: string;
  stage: InvestigationStage;
  eventType: string;
  capturePoint: InvestigationInstrumentationEvent['payload']['capturePoint'];
  data: Record<string, unknown>;
}

interface CompleteRunInput {
  runId: string;
  invalidationReason?: string;
}

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}

function safeReadJson<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as T[];
  } catch {
    return [];
  }
}

function safeWriteJson<T>(key: string, value: T[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function isInvestigationModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const fromStorage = window.localStorage.getItem('wf.investigationMode') === '1';
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('investigation') === '1';
  return fromStorage || fromQuery;
}

export function createParityCaptureSession(options: CreateSessionOptions) {
  const enabled = options.enabled;

  function startRun(input: StartRunInput): StartRunResult | null {
    if (!enabled) return null;
    const run: InvestigationRunCapture = {
      runId: makeId('run'),
      featureId: INVESTIGATION_FEATURE_ID,
      fixtureId: input.fixtureId,
      issueFocus: input.issueFocus,
      buildHash: input.buildHash,
      operator: options.operator,
      startedAt: new Date().toISOString(),
      runStatus: 'in_progress',
    };
    const runs = safeReadJson<InvestigationRunCapture>(INVESTIGATION_RUN_STORAGE_KEY);
    runs.push(run);
    safeWriteJson(INVESTIGATION_RUN_STORAGE_KEY, runs);
    return { run };
  }

  function captureStage(input: CaptureStageInput): InvestigationInstrumentationEvent | null {
    if (!enabled) return null;
    const event: InvestigationInstrumentationEvent = {
      eventId: makeId('evt'),
      runId: input.runId,
      stage: input.stage,
      eventType: input.eventType,
      eventTs: new Date().toISOString(),
      fixtureId: input.fixtureId,
      buildHash: input.buildHash,
      payload: {
        capturePoint: input.capturePoint,
        data: input.data,
      },
    };
    const events = safeReadJson<InvestigationInstrumentationEvent>(INVESTIGATION_EVENT_STORAGE_KEY);
    events.push(event);
    safeWriteJson(INVESTIGATION_EVENT_STORAGE_KEY, events);
    return event;
  }

  function completeRun(input: CompleteRunInput): InvestigationRunCapture | null {
    if (!enabled) return null;
    const runs = safeReadJson<InvestigationRunCapture>(INVESTIGATION_RUN_STORAGE_KEY);
    const idx = runs.findIndex((run) => run.runId === input.runId);
    if (idx < 0) return null;
    const current = runs[idx];
    const updated: InvestigationRunCapture = {
      ...current,
      runStatus: input.invalidationReason ? 'invalidated' : 'completed',
      completedAt: new Date().toISOString(),
      ...(input.invalidationReason ? { invalidationReason: input.invalidationReason } : {}),
    };
    runs[idx] = updated;
    safeWriteJson(INVESTIGATION_RUN_STORAGE_KEY, runs);
    return updated;
  }

  return {
    enabled,
    startRun,
    captureStage,
    completeRun,
  };
}
