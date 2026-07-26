export interface WatchModelTarget {
  name?: string;
  specGroup?: string;
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
