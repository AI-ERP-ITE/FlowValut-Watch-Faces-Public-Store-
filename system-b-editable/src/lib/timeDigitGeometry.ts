export function resolveTabularCellWidth(naturalWidths: readonly number[]): number {
  return Math.max(1, ...naturalWidths.map((width) => Math.max(1, Math.ceil(width))));
}

export function getTimePairWidth(cellWidth: number, hSpace = 0): number {
  return Math.max(1, Math.ceil(cellWidth)) * 2 + Math.max(0, Math.floor(hSpace));
}

export function getCenteredTimeStartX(
  bounds: { x: number; width: number },
  cellWidth: number,
  hSpace = 0,
): number {
  const pairWidth = getTimePairWidth(cellWidth, hSpace);
  return Math.round(bounds.x + bounds.width / 2 - pairWidth / 2);
}
