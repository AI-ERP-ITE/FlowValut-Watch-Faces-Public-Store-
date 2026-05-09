import {
  getEffectParameterProfile,
  hasEffectParameterProfile,
  type EffectParameterProfileKey,
} from './effectProfiles';
import { mapUiValueToRenderValue, mapRenderValueToUiValue } from './parameterMapping';

/**
 * Convert a clean UI integer (e.g. 75 out of 0..100) to the compressed
 * render value using the watchface-safe profile for the given key.
 *
 * Returns the raw render value unchanged when no profile is registered for
 * the key (allows graceful passthrough for unmapped controls).
 */
export function mapEffectUiToRender(key: EffectParameterProfileKey | string, uiValue: number): number {
  if (!hasEffectParameterProfile(key)) {
    return uiValue;
  }
  const profile = getEffectParameterProfile(key as EffectParameterProfileKey);
  const render = mapUiValueToRenderValue(uiValue, profile);
  // Normalise precision — avoids float drift accumulation.
  return Number(render.toFixed(profile.precision));
}

/**
 * Convert a stored render value back to clean UI integer for slider display.
 *
 * Returns the raw render value unchanged when no profile is registered.
 */
export function mapEffectRenderToUi(key: EffectParameterProfileKey | string, renderValue: number): number {
  if (!hasEffectParameterProfile(key)) {
    return renderValue;
  }
  const profile = getEffectParameterProfile(key as EffectParameterProfileKey);
  return mapRenderValueToUiValue(renderValue, profile);
}

export { getEffectParameterProfile, hasEffectParameterProfile };
export type { EffectParameterProfileKey };
