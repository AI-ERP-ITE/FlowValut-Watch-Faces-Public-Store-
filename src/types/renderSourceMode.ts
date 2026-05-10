/**
 * Explicit render source mode for a layer. After one-time migration this is the
 * SINGLE authoritative state field consumed by the source resolver. The
 * renderer/resolver MUST NOT re-infer this from visuals at render time.
 *
 *  - procedural          : live geometry + live masks + live effects
 *  - baked-live-mask     : surface is a baked image, but mask is still live on
 *                          the element (mask was NOT embedded into the snapshot)
 *  - baked-baked-mask    : the baked image already contains the masked shape
 *                          (mask was embedded at snapshot capture time);
 *                          additional live masks on top are still allowed
 */
export type RenderSourceMode =
  | 'procedural'
  | 'baked-live-mask'
  | 'baked-baked-mask';

export const RENDER_SOURCE_MODES: readonly RenderSourceMode[] = [
  'procedural',
  'baked-live-mask',
  'baked-baked-mask',
] as const;

export function isRenderSourceMode(value: unknown): value is RenderSourceMode {
  return value === 'procedural' || value === 'baked-live-mask' || value === 'baked-baked-mask';
}

/**
 * Surface source = the visible material/pixel/color surface of THIS layer.
 * Consumed by: texture, material, gradient, contrast, hue, sharpness, color
 * wheel, highlights, surface compositing.
 */
export type SurfaceSource =
  | { kind: 'procedural'; elementId: string }
  | { kind: 'baked-image'; imageDataUrl: string; width: number; height: number };

/**
 * Silhouette source = the visible alpha/shape/outline of THIS layer.
 * Consumed by: shadow, depth, glow, bevel, emboss, edge lighting, any
 * outline-dependent effect.
 *
 * IMPORTANT: silhouette must NEVER be derived from original geometry, parent
 * geometry, snapshot rectangle bounds, pre-mask shape, or cached old silhouette.
 */
export type SilhouetteSource =
  | { kind: 'procedural-vector'; elementId: string; liveMaskKey: string | null }
  | {
      kind: 'baked-alpha';
      imageDataUrl: string;
      width: number;
      height: number;
      additionalLiveMaskKey: string | null;
    };
