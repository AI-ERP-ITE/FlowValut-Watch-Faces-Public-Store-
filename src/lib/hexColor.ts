export function normalizeHexDigits(input: string): string {
  return input.trim().replace(/^#/, '').replace(/^0x/i, '').replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase();
}

export function hexDigitsFromColor(input: string | undefined, fallback = 'FFFFFF'): string {
  const digits = normalizeHexDigits(input ?? '');
  return digits.length === 6 ? digits : fallback;
}
