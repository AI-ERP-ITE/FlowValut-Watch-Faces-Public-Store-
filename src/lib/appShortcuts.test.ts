import { describe, expect, it } from 'vitest';
import type { WatchFaceElement } from '@/types';
import { APP_SHORTCUTS, supportsAppShortcut } from '@/lib/appShortcuts';

const element = (type: WatchFaceElement['type']): WatchFaceElement => ({
  id: type,
  name: type,
  type,
  bounds: { x: 0, y: 0, width: 40, height: 40 },
  visible: true,
  zIndex: 1,
});

describe('app shortcut catalog', () => {
  it('includes current FlowVault data and Zepp launch destinations', () => {
    const values = APP_SHORTCUTS.map(shortcut => shortcut.value);
    expect(values).toContain('BIO_CHARGE');
    expect(values).toContain('TRAINING_LOAD');
    expect(values).toContain('SUN_RISE');
    expect(values).toContain('OUTDOOR_RUNNING');
    expect(values).not.toContain('WEATHER_STATUS');
  });

  it('offers shortcuts on eligible widgets but not arcs', () => {
    expect(supportsAppShortcut(element('TEXT_IMG'))).toBe(true);
    expect(supportsAppShortcut(element('IMG_LEVEL'))).toBe(true);
    expect(supportsAppShortcut(element('GAUGE_POINTER'))).toBe(true);
    expect(supportsAppShortcut(element('ARC_PROGRESS'))).toBe(false);
  });
});
