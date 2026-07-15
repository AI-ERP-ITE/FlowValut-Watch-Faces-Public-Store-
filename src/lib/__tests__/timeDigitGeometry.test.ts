import { describe, expect, test } from 'vitest';
import {
  getCenteredTimeStartX,
  getTimePairWidth,
  resolveTabularCellWidth,
} from '../timeDigitGeometry';

describe('time-only tabular geometry', () => {
  test('uses the widest natural advance as the common cell', () => {
    expect(resolveTabularCellWidth([14.1, 28, 23.2, 27.1])).toBe(28);
  });

  test('makes every zero-padded pair the same width', () => {
    const cellWidth = resolveTabularCellWidth([14, 28, 25]);
    expect(getTimePairWidth(cellWidth)).toBe(56);
    expect(getTimePairWidth(cellWidth, 2)).toBe(58);
  });

  test('converts the frame center to Zepp left-origin coordinates', () => {
    expect(getCenteredTimeStartX({ x: 100, width: 80 }, 30)).toBe(110);
    expect(getCenteredTimeStartX({ x: 101, width: 81 }, 30)).toBe(112);
  });
});
