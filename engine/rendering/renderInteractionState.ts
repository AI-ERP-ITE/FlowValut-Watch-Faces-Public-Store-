export type RenderInteractionMode = 'idle' | 'editing';
export type RenderQualityMode = 'preview' | 'final';

export const RENDER_INTERACTION_IDLE_DEBOUNCE_MS = 100;

type RenderInteractionModeListener = (mode: RenderInteractionMode) => void;

const activeInteractionSources = new Set<string>();
const listeners = new Set<RenderInteractionModeListener>();

let renderInteractionMode: RenderInteractionMode = 'idle';
let idleDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function emitModeChange(nextMode: RenderInteractionMode): void {
  if (renderInteractionMode === nextMode) return;
  renderInteractionMode = nextMode;
  listeners.forEach((listener) => {
    listener(renderInteractionMode);
  });
}

function cancelIdleDebounce(): void {
  if (idleDebounceTimer) {
    clearTimeout(idleDebounceTimer);
    idleDebounceTimer = null;
  }
}

export function getRenderInteractionMode(): RenderInteractionMode {
  return renderInteractionMode;
}

export function getRenderQualityMode(): RenderQualityMode {
  return renderInteractionMode === 'editing' ? 'preview' : 'final';
}

export function beginRenderInteraction(source = 'unknown'): void {
  const sourceKey = source.trim().length > 0 ? source.trim() : 'unknown';
  cancelIdleDebounce();
  activeInteractionSources.add(sourceKey);
  emitModeChange('editing');
}

export function endRenderInteraction(source = 'unknown', debounceMs = RENDER_INTERACTION_IDLE_DEBOUNCE_MS): void {
  const sourceKey = source.trim().length > 0 ? source.trim() : 'unknown';
  activeInteractionSources.delete(sourceKey);

  if (activeInteractionSources.size > 0) {
    return;
  }

  cancelIdleDebounce();

  const safeDebounceMs = Number.isFinite(debounceMs)
    ? Math.max(0, Math.round(debounceMs))
    : RENDER_INTERACTION_IDLE_DEBOUNCE_MS;

  idleDebounceTimer = setTimeout(() => {
    idleDebounceTimer = null;
    if (activeInteractionSources.size === 0) {
      emitModeChange('idle');
    }
  }, safeDebounceMs);
}

export function subscribeRenderInteractionMode(listener: RenderInteractionModeListener): () => void {
  listeners.add(listener);
  listener(renderInteractionMode);
  return () => {
    listeners.delete(listener);
  };
}

export function clearRenderInteractionSources(): void {
  activeInteractionSources.clear();
}

export function resetRenderInteractionState(): void {
  cancelIdleDebounce();
  clearRenderInteractionSources();
  emitModeChange('idle');
}
