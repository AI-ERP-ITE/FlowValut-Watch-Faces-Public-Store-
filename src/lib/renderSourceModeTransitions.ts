import type { RenderSourceMode } from '../types/renderSourceMode';

type AnyRecord = Record<string, unknown>;

/**
 * Explicit transition helpers — the ONLY sanctioned mutators of
 * `renderState.renderSourceMode` and `renderState.maskEmbeddedInSnapshot`.
 *
 * Renderer / resolver / effects / filters / masks MUST NOT call these and
 * MUST NOT mutate these fields directly. Only explicit user-driven editor
 * actions (Bake, Bake Layer / Bake After Mask, Restore Procedural) may
 * trigger a transition.
 *
 * These helpers are intentionally additive — they DO NOT touch the legacy
 * `sourceMode` / `snapshotStatus` fields. The existing snapshot helpers
 * (`setElementSnapshot`, `setElementRenderSourceMode`, `deleteElementSnapshot`)
 * remain in charge of legacy field bookkeeping; these helpers only stamp the
 * new canonical state on top.
 */

function withRenderState<T extends AnyRecord>(element: T, patch: AnyRecord): T {
  const rs = (element as AnyRecord).renderState;
  const base: AnyRecord = rs && typeof rs === 'object' ? (rs as AnyRecord) : {};
  return {
    ...(element as AnyRecord),
    renderState: { ...base, ...patch },
  } as unknown as T;
}

function setRenderSourceMode<T extends AnyRecord>(
  element: T,
  mode: RenderSourceMode,
  maskEmbeddedInSnapshot: boolean,
): T {
  return withRenderState(element, {
    renderSourceMode: mode,
    maskEmbeddedInSnapshot,
  });
}

/** Bake without embedding the mask. Mask remains live on the element. */
export function transitionToBakedLiveMask<T extends AnyRecord>(element: T): T {
  return setRenderSourceMode(element, 'baked-live-mask', false);
}

/**
 * Bake the masked result into the snapshot. Mask is now embedded in pixels.
 * The caller (editor action) is responsible for stripping `element.mask`
 * separately if the workflow requires it.
 */
export function transitionToBakedBakedMask<T extends AnyRecord>(element: T): T {
  return setRenderSourceMode(element, 'baked-baked-mask', true);
}

/** Restore procedural mode. Snapshot pixels (if any) are kept by the caller. */
export function transitionToProcedural<T extends AnyRecord>(element: T): T {
  return setRenderSourceMode(element, 'procedural', false);
}
