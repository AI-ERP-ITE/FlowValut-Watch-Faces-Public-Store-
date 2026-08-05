import { describe, expect, it } from 'vitest';
import type { WatchFaceElement } from '@/types';
import { getDigitPreviewValue } from './digitLayoutEngine';

const widget = (type: WatchFaceElement['type'], subtype?: string): WatchFaceElement => ({
  id: `${type}-${subtype ?? ''}`,
  type,
  subtype,
  name: type,
  bounds: { x: 0, y: 0, width: 10, height: 10 },
  visible: true,
  zIndex: 1,
});

describe('approved digital preview reference', () => {
  it('shows 16:49:15 and day 31', () => {
    expect(getDigitPreviewValue(widget('IMG_TIME', 'hours'))).toBe('16');
    expect(getDigitPreviewValue(widget('IMG_TIME', 'minutes'))).toBe('49');
    expect(getDigitPreviewValue(widget('IMG_TIME', 'seconds'))).toBe('15');
    expect(getDigitPreviewValue(widget('IMG_DATE'))).toBe('31');
  });

  it('keeps date and clock samples automatic even when an old project stored a custom preview', () => {
    expect(getDigitPreviewValue({ ...widget('IMG_TIME', 'hours'), previewValue: '99' })).toBe('16');
    expect(getDigitPreviewValue({ ...widget('IMG_DATE'), previewValue: '01' })).toBe('31');
  });
});
