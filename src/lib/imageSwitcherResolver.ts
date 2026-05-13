/**
 * imageSwitcherResolver.ts — Spec 088 Phase B
 * Heart-rate zone builder, slot resolver, default slot builder, and definition validator.
 */

import type {
  ImageSwitcherDefinition,
  RangeSlot,
  ResolveResult,
  UserProfile,
  HeartZone,
} from '@/types/imageSwitcher';
import { IMAGE_SWITCHER_FIXED_SLOT_COUNTS } from '@/lib/elementDataRules';

// ── Heart-rate zones (Karvonen method) ────────────────────────────────────────

const ZONE_LABELS = ['Resting', 'Fat Burn', 'Cardio', 'Peak', 'Max'] as const;

/**
 * Build 5 heart-rate zones from a UserProfile using the Karvonen (Heart Rate Reserve) method.
 * Zone boundaries (% of HRR): Resting=0–50, FatBurn=50–60, Cardio=60–75, Peak=75–90, Max=90–100+
 */
export function buildHeartZones(profile: UserProfile): HeartZone[] {
  const { restingHeartRate: rhr, maxHeartRate: mhr } = profile;
  const hrr = mhr - rhr;

  const percentages: [number, number][] = [
    [0,   50],
    [50,  60],
    [60,  75],
    [75,  90],
    [90, 100],
  ];

  return percentages.map(([lo, hi], i) => ({
    zoneIndex: i,
    label: ZONE_LABELS[i],
    min: i === 0 ? 0 : Math.round(rhr + (hrr * lo) / 100),
    max: i === percentages.length - 1
      ? Math.round(mhr)
      : Math.round(rhr + (hrr * hi) / 100) - 1,
  }));
}

// ── Slot resolver ─────────────────────────────────────────────────────────────

/**
 * Resolve a live numeric value to the matching slot in a definition.
 */
export function resolveSlot(
  liveValue: number,
  definition: ImageSwitcherDefinition,
  profile?: UserProfile,
): ResolveResult {
  const { ranges, policyType } = definition;

  let matchIndex = -1;

  if (policyType === 'FIXED_CODES') {
    matchIndex = ranges.findIndex(s => s.code === Math.round(liveValue));
  } else if (policyType === 'PERCENT_RANGES') {
    matchIndex = ranges.findIndex(
      s => liveValue >= (s.min ?? 0) && liveValue <= (s.max ?? 100),
    );
  } else if (policyType === 'DYNAMIC_RANGES') {
    const zones = profile ? buildHeartZones(profile) : (definition.userProfile ? buildHeartZones(definition.userProfile) : null);
    if (zones) {
      const zoneIdx = zones.findIndex(z => liveValue >= z.min && liveValue <= z.max);
      if (zoneIdx >= 0) matchIndex = zoneIdx;
    } else {
      matchIndex = ranges.findIndex(
        s => liveValue >= (s.min ?? 0) && liveValue <= (s.max ?? 9999),
      );
    }
  } else {
    // ABSOLUTE_RANGES
    matchIndex = ranges.findIndex(
      s => liveValue >= (s.min ?? 0) && liveValue <= (s.max ?? 9999),
    );
  }

  // Fallback: last slot
  if (matchIndex === -1) matchIndex = ranges.length - 1;

  const slot = ranges[matchIndex];
  return {
    slotIndex: matchIndex,
    downloadURL: slot?.baked?.downloadURL ?? null,
    dataUrl: slot?.dataUrl,
    slot,
  };
}

// ── Default slot builder ──────────────────────────────────────────────────────

const WEATHER_CODE_LABELS: Record<number, string> = {
  0: 'Cloudy', 1: 'Shower Rain', 2: 'Snow', 3: 'Thunder', 4: 'Sleet',
  5: 'Light Rain', 6: 'Light Snow', 7: 'Moderate Rain', 8: 'Moderate Snow',
  9: 'Heavy Rain', 10: 'Heavy Snow', 11: 'Sand Storm', 12: 'Fog',
  13: 'Haze', 14: 'Windy', 15: 'Sunny', 16: 'Clear Night', 17: 'Overcast',
  18: 'Mostly Sunny', 19: 'Mostly Clear Night', 20: 'Mostly Cloudy',
  21: 'Partly Cloudy', 22: 'Partly Clear Night', 23: 'Light Rain Night',
  24: 'Thunder Night', 25: 'Sleet Night', 26: 'Shower Night',
  27: 'Heavy Rain Night', 28: 'Sand Storm Night',
};

function buildWeatherSlots(count: number): RangeSlot[] {
  return Array.from({ length: count }, (_, i) => ({
    slotIndex: i,
    label: WEATHER_CODE_LABELS[i] ?? `Code ${i}`,
    code: i,
  }));
}

function buildMoonSlots(): RangeSlot[] {
  const labels = ['New', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
    'Full', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
  return Array.from({ length: 8 }, (_, i) => ({
    slotIndex: i,
    label: labels[i],
    code: i,
  }));
}

function buildBatterySlots(): RangeSlot[] {
  return [
    { slotIndex: 0, label: 'Critical',  min: 0,  max: 20 },
    { slotIndex: 1, label: 'Low',       min: 21, max: 40 },
    { slotIndex: 2, label: 'Medium',    min: 41, max: 70 },
    { slotIndex: 3, label: 'High',      min: 71, max: 100 },
  ];
}

function buildHeartDefaultSlots(profile?: UserProfile): RangeSlot[] {
  const zones = profile
    ? buildHeartZones(profile)
    : [
        { zoneIndex: 0, label: 'Resting',  min: 0,   max: 99  },
        { zoneIndex: 1, label: 'Fat Burn', min: 100, max: 119 },
        { zoneIndex: 2, label: 'Cardio',   min: 120, max: 139 },
        { zoneIndex: 3, label: 'Peak',     min: 140, max: 159 },
        { zoneIndex: 4, label: 'Max',      min: 160, max: 220 },
      ];
  return zones.map(z => ({
    slotIndex: z.zoneIndex,
    label: z.label,
    min: z.min,
    max: z.max,
  }));
}

function buildAbsoluteSlots(dataType: string): RangeSlot[] {
  const presets: Record<string, Array<[string, number, number]>> = {
    STEP:     [['Low', 0, 2999], ['Medium', 3000, 7999], ['High', 8000, 20000]],
    CAL:      [['Low', 0, 299], ['Medium', 300, 699], ['High', 700, 9999]],
    DISTANCE: [['Low', 0, 4999], ['Medium', 5000, 9999], ['High', 10000, 99999]],
    STRESS:   [['Relaxed', 0, 29], ['Normal', 30, 59], ['Medium', 60, 79], ['High', 80, 100]],
    SPO2:     [['Normal', 95, 100], ['Slightly Low', 90, 94], ['Low', 0, 89]],
    AQI:      [['Good', 0, 50], ['Moderate', 51, 100], ['Unhealthy', 101, 200], ['Hazardous', 201, 500]],
    UVI:      [['Low', 0, 2], ['Moderate', 3, 5], ['High', 6, 7], ['Very High', 8, 10], ['Extreme', 11, 16]],
    HUMIDITY: [['Dry', 0, 30], ['Comfortable', 31, 60], ['Humid', 61, 100]],
    STAND:    [['Low', 0, 7], ['Medium', 8, 14], ['High', 15, 24]],
    PAI:      [['Inactive', 0, 24], ['Active', 25, 99], ['Fit', 100, 300]],
    PAI_WEEKLY: [['Low', 0, 49], ['Medium', 50, 99], ['High', 100, 300]],
    FAT_BURN: [['Low', 0, 49], ['Medium', 50, 99], ['High', 100, 200]],
  };
  const entries = presets[dataType] ?? [['Low', 0, 49], ['Medium', 50, 74], ['High', 75, 100]];
  return entries.map(([label, min, max], i) => ({ slotIndex: i, label, min, max }));
}

/**
 * Build sensible default RangeSlots for a given dataType + optional profile.
 * Used when user creates a new ImageSwitcherDefinition.
 */
export function buildDefaultSlots(dataType: string, profile?: UserProfile): RangeSlot[] {
  const fixedCount = IMAGE_SWITCHER_FIXED_SLOT_COUNTS[dataType];
  if (dataType === 'WEATHER_CURRENT' || dataType === 'WEATHER_STATUS') {
    return buildWeatherSlots(fixedCount ?? 29);
  }
  if (dataType === 'MOON') {
    return buildMoonSlots();
  }
  if (dataType === 'BATTERY') {
    return buildBatterySlots();
  }
  if (dataType === 'HEART') {
    return buildHeartDefaultSlots(profile);
  }
  return buildAbsoluteSlots(dataType);
}

// ── Validator ─────────────────────────────────────────────────────────────────

/**
 * Validate a definition before save.
 * Returns array of error strings (empty array = valid).
 */
export function validateDefinition(def: ImageSwitcherDefinition): string[] {
  const errors: string[] = [];

  if (!def.name.trim()) {
    errors.push('Name is required.');
  }

  if (!def.dataType) {
    errors.push('Data type is required.');
  }

  const { policyType, ranges } = def;

  if (ranges.length === 0) {
    errors.push('At least one slot is required.');
    return errors;
  }

  if (policyType === 'FIXED_CODES') {
    const fixedCount = IMAGE_SWITCHER_FIXED_SLOT_COUNTS[def.dataType];
    if (fixedCount !== undefined && ranges.length !== fixedCount) {
      errors.push(`Expected exactly ${fixedCount} slots for ${def.dataType}, got ${ranges.length}.`);
    }
    const codes = ranges.map(s => s.code);
    const uniqueCodes = new Set(codes.filter(c => c !== undefined));
    if (uniqueCodes.size !== codes.length) {
      errors.push('Duplicate slot codes detected.');
    }
    if (fixedCount !== undefined) {
      for (let i = 0; i < fixedCount; i++) {
        if (!uniqueCodes.has(i)) {
          errors.push(`Missing code ${i}.`);
        }
      }
    }
  } else if (policyType === 'PERCENT_RANGES') {
    if (ranges.length < 2) errors.push('At least 2 slots required for percent ranges.');
    for (const s of ranges) {
      if (s.min === undefined || s.max === undefined) {
        errors.push(`Slot "${s.label}" is missing min/max.`);
      } else if (s.min < 0 || s.max > 100) {
        errors.push(`Slot "${s.label}" min/max must be within 0–100%.`);
      } else if (s.min > s.max) {
        errors.push(`Slot "${s.label}" min cannot exceed max.`);
      }
    }
    // Check ordering
    for (let i = 1; i < ranges.length; i++) {
      if ((ranges[i].min ?? 0) <= (ranges[i - 1].max ?? 0)) {
        errors.push(`Slot "${ranges[i].label}" overlaps with previous slot.`);
      }
    }
  } else if (policyType === 'DYNAMIC_RANGES') {
    if (ranges.length < 2) errors.push('At least 2 zones required for dynamic ranges.');
    if (!def.userProfile) errors.push('User profile required for dynamic (heart rate) ranges.');
  } else if (policyType === 'ABSOLUTE_RANGES') {
    if (ranges.length < 2) errors.push('At least 2 slots required for absolute ranges.');
    for (const s of ranges) {
      if (s.min === undefined || s.max === undefined) {
        errors.push(`Slot "${s.label}" is missing min/max.`);
      } else if (s.min > s.max) {
        errors.push(`Slot "${s.label}" min cannot exceed max.`);
      }
    }
    for (let i = 1; i < ranges.length; i++) {
      if ((ranges[i].min ?? 0) <= (ranges[i - 1].max ?? 0)) {
        errors.push(`Slot "${ranges[i].label}" overlaps with previous slot.`);
      }
    }
  }

  return errors;
}
