export interface WatchModelTarget {
  name?: string;
  specGroup?: string;
}

export interface TechnicalTargetDefinition {
  resolution?: string;
}

function normalizedModelName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^amazfit[\s_-]+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function resolveWatchModelTarget(
  selectedModel: string,
  models: Record<string, WatchModelTarget>,
): { modelId: string; specGroup: string } | null {
  const selected = selectedModel.trim();
  if (!selected) return null;

  const direct = models[selected];
  if (direct?.specGroup?.trim()) {
    return { modelId: selected, specGroup: direct.specGroup.trim() };
  }

  const exactName = Object.entries(models).find(([, model]) => model.name?.trim() === selected);
  if (exactName?.[1].specGroup?.trim()) {
    return { modelId: exactName[0], specGroup: exactName[1].specGroup.trim() };
  }

  const normalized = normalizedModelName(selected);
  const matches = Object.entries(models).filter(
    ([modelId, model]) =>
      normalizedModelName(model.name || modelId) === normalized &&
      Boolean(model.specGroup?.trim()),
  );

  return matches.length === 1
    ? { modelId: matches[0][0], specGroup: matches[0][1].specGroup!.trim() }
    : null;
}

export function resolveUniqueTargetByResolution(
  resolution: { width: number; height: number } | undefined,
  targets: Record<string, TechnicalTargetDefinition>,
): string | null {
  if (!resolution || !Number.isInteger(resolution.width) || !Number.isInteger(resolution.height)) {
    return null;
  }
  const expected = `${resolution.width}x${resolution.height}`.toLowerCase();
  const matches = Object.entries(targets)
    .filter(([, target]) => target.resolution?.trim().toLowerCase() === expected)
    .map(([id]) => id);
  return matches.length === 1 ? matches[0] : null;
}
