import type { SpecGroup } from '@/context/CatalogContext';

/**
 * Given canvas dimensions, find the matching spec group key.
 * Returns null if no match found.
 */
export function detectSpecGroup(
  width: number,
  height: number,
  specGroups: Record<string, SpecGroup>
): string | null {
  const resolution = `${width}x${height}`;
  const shape: 'round' | 'square' = width === height ? 'round' : 'square';

  for (const [key, sg] of Object.entries(specGroups)) {
    if (sg.resolution === resolution && sg.shape === shape) {
      return key;
    }
  }

  return null;
}

/**
 * Describe a spec group key in human-readable form for UI display.
 */
export function describeSpecGroup(_key: string, sg: SpecGroup): string {
  const versions = sg.supportedConfigVersions.map((v) => v.toUpperCase()).join(' + ');
  return `${sg.resolution} · ${sg.shape} · ${versions}`;
}
