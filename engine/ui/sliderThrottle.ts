export function normalizeSliderDebounceMs(debounceMs?: number): number {
  if (!Number.isFinite(debounceMs)) {
    return 16;
  }
  return Math.max(16, Number(debounceMs));
}

export function shouldApplySliderUpdate(
  timestampMs: number,
  lastAppliedTimestampMs: number,
  debounceMs?: number,
): boolean {
  return timestampMs - lastAppliedTimestampMs >= normalizeSliderDebounceMs(debounceMs);
}
