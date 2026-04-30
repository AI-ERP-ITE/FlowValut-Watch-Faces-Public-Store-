// Deterministic FNV-1a hash (matches CompilerPage convention).
// Used to derive registryHash without pulling in crypto.

export function fnv1aHex(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

// Canonical JSON: stable key ordering so the same logical doc → identical hash.
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`).join(',')}}`;
}

export function computeRegistryHash(registry: unknown, imageHash = ''): string {
  return `r${fnv1aHex(canonicalJson(registry) + '|' + imageHash)}`;
}
