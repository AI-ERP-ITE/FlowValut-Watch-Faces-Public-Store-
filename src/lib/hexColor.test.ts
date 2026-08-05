import { describe, expect, it } from 'vitest';
import { hexDigitsFromColor, normalizeHexDigits } from './hexColor';

describe('protected hex color normalization', () => {
  it('accepts pasted colors with or without a prefix', () => {
    expect(normalizeHexDigits('#a1b2c3')).toBe('A1B2C3');
    expect(normalizeHexDigits('A1B2C3')).toBe('A1B2C3');
  });
  it('uses a safe fallback for incomplete colors', () => expect(hexDigitsFromColor('#12', 'ABCDEF')).toBe('ABCDEF'));
});
