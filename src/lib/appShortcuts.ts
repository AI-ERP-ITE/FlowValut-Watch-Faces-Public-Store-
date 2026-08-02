import type { WatchFaceElement } from '@/types';
import { DATA_TYPE_LABELS } from '@/lib/elementDataRules';

const NON_SHORTCUT_DATA_TYPES = new Set(['DIST', 'WEATHER_STATUS']);

const SHORTCUT_ONLY_DESTINATIONS: Record<string, string> = {
  OUTDOOR_RUNNING: 'Outdoor Running',
  WALKING: 'Walking',
  OUTDOOR_CYCLING: 'Outdoor Cycling',
  FREE_TRAINING: 'Free Training',
  POOL_SWIMMING: 'Pool Swimming',
  OPEN_WATER_SWIMMING: 'Open Water Swimming',
  PHN: 'Sports Coach',
  BREATH_TRAIN: 'Breathing Training',
};

export const APP_SHORTCUTS = [
  { value: '', label: '— none —' },
  ...Object.entries(DATA_TYPE_LABELS)
    .filter(([value]) => !NON_SHORTCUT_DATA_TYPES.has(value))
    .map(([value, label]) => ({ value, label })),
  ...Object.entries(SHORTCUT_ONLY_DESTINATIONS)
    .map(([value, label]) => ({ value, label })),
];

export function supportsAppShortcut(element: WatchFaceElement): boolean {
  return element.type !== 'ARC_PROGRESS';
}
