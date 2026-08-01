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
import {
  IMAGE_SWITCHER_DEFAULT_MOON_FRAME_COUNT,
  IMAGE_SWITCHER_FIXED_SLOT_COUNTS,
  IMAGE_SWITCHER_MOON_FRAME_COUNTS,
} from '@/lib/elementDataRules';
import { ZEP_WEATHER_CONDITION_CODES } from '@/lib/dataRepresentationAuthority';

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

function buildWeatherSlots(count: number): RangeSlot[] {
  return Array.from({ length: count }, (_, i) => ({
    slotIndex: i,
    label: ZEP_WEATHER_CONDITION_CODES[i]?.label ?? `Code ${i}`,
    code: i,
  }));
}

/**
 * Expands inclusive integer ranges into an IMG_LEVEL array indexed by the live
 * data value. Repeated filenames do not duplicate PNG bytes in the package.
 */
export function expandAbsoluteRangeFrames(
  frames: readonly string[],
  ranges: readonly RangeSlot[],
  domainMin: number,
  domainMax: number,
): string[] {
  if (frames.length !== ranges.length) {
    throw new Error(`Range frame count ${frames.length} does not match slot count ${ranges.length}.`);
  }
  const expanded: string[] = [];
  for (let value = domainMin; value <= domainMax; value += 1) {
    const slotIndex = ranges.findIndex((slot) =>
      value >= (slot.min ?? Number.POSITIVE_INFINITY)
      && value <= (slot.max ?? Number.NEGATIVE_INFINITY));
    if (slotIndex < 0) throw new Error(`No image-switcher range covers value ${value}.`);
    expanded.push(frames[slotIndex]);
  }
  return expanded;
}

export interface HumidityRangeRepairProposal {
  issues: string[];
  changes: string[];
  ranges: RangeSlot[];
}

export type HundredRangeRepairProposal = HumidityRangeRepairProposal;

function auditHundredRanges(ranges: readonly RangeSlot[], label: string): string[] {
  const issues: string[] = [];
  if (ranges.length < 2) issues.push(`${label} requires at least two ranges.`);
  ranges.forEach((slot, index) => {
    if (!Number.isInteger(slot.min) || !Number.isInteger(slot.max)) {
      issues.push(`Slot ${index + 1} must use integer min/max values.`);
    } else if (slot.min! < 0 || slot.max! > 100 || slot.min! > slot.max!) {
      issues.push(`Slot ${index + 1} must stay within 0–100 and min must not exceed max.`);
    }
    if (index > 0 && Number.isFinite(slot.min) && Number.isFinite(ranges[index - 1].max)) {
      const expected = ranges[index - 1].max! + 1;
      if (slot.min !== expected) {
        issues.push(slot.min! < expected
          ? `Slots ${index} and ${index + 1} overlap.`
          : `Gap before slot ${index + 1}: expected min ${expected}, got ${slot.min}.`);
      }
    }
  });
  if (ranges[0]?.min !== 0) issues.push(`${label} ranges must start at 0.`);
  if (ranges[ranges.length - 1]?.max !== 100) issues.push(`${label} ranges must end at 100.`);
  return issues;
}

/** Audits Humidity's complete integer domain without mutating stored slots. */
export function auditHumidityRanges(ranges: readonly RangeSlot[]): string[] {
  return auditHundredRanges(ranges, 'Humidity');
}

export function auditBioChargeRanges(ranges: readonly RangeSlot[]): string[] {
  return auditHundredRanges(ranges, 'HybridCharge / BioCharge');
}

/**
 * Produces an explicit, minimal boundary repair. It never changes slot order or
 * non-boundary fields and returns the original slot objects when already valid.
 */
export function proposeHumidityRangeRepair(ranges: readonly RangeSlot[]): HumidityRangeRepairProposal {
  return proposeHundredRangeRepair(ranges, 'Humidity');
}

export function proposeBioChargeRangeRepair(ranges: readonly RangeSlot[]): HundredRangeRepairProposal {
  return proposeHundredRangeRepair(ranges, 'HybridCharge / BioCharge');
}

function proposeHundredRangeRepair(ranges: readonly RangeSlot[], label: string): HundredRangeRepairProposal {
  const issues = auditHundredRanges(ranges, label);
  if (issues.length === 0) return { issues, changes: [], ranges: ranges as RangeSlot[] };
  if (ranges.length < 2 || ranges.length > 101) {
    return { issues, changes: ['Automatic repair unavailable for this slot count.'], ranges: [...ranges] };
  }

  const repaired: RangeSlot[] = [];
  const changes: string[] = [];
  let cursor = 0;
  ranges.forEach((slot, index) => {
    const remaining = ranges.length - index - 1;
    const maxAllowed = 100 - remaining;
    const rawMax = Number.isFinite(slot.max) ? Math.round(slot.max!) : cursor;
    const max = index === ranges.length - 1
      ? 100
      : Math.min(maxAllowed, Math.max(cursor, rawMax));
    const next = { ...slot, slotIndex: index, min: cursor, max };
    if (slot.slotIndex !== next.slotIndex || slot.min !== next.min || slot.max !== next.max) {
      changes.push(`Slot ${index + 1}: ${slot.min ?? '?'}–${slot.max ?? '?'} → ${next.min}–${next.max}`);
    }
    repaired.push(next);
    cursor = max + 1;
  });
  return { issues, changes, ranges: repaired };
}

function buildMoonSlots(count: number): RangeSlot[] {
  return Array.from({ length: count }, (_, i) => ({
    slotIndex: i,
    label: count === 30 ? `Lunar Day ${i + 1}` : `Phase ${i + 1} of ${count}`,
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
    BIO_CHARGE: [['Low', 0, 30], ['Balanced', 31, 70], ['High', 71, 100]],
    STAND:    [['Low', 0, 7], ['Medium', 8, 14], ['High', 15, 24]],
    PAI_DAILY: [['Inactive', 0, 24], ['Active', 25, 49], ['Fit', 50, 75]],
    PAI_WEEKLY: [['Low', 0, 49], ['Medium', 50, 99], ['High', 100, 300]],
    FAT_BURNING: [['Low', 0, 49], ['Medium', 50, 99], ['High', 100, 999]],
  };
  const entries = presets[dataType] ?? [['Low', 0, 49], ['Medium', 50, 74], ['High', 75, 100]];
  return entries.map(([label, min, max], i) => ({ slotIndex: i, label, min, max }));
}

/**
 * Build sensible default RangeSlots for a given dataType + optional profile.
 * Used when user creates a new ImageSwitcherDefinition.
 */
export function buildDefaultSlots(dataType: string, profile?: UserProfile, slotCount?: number): RangeSlot[] {
  const fixedCount = IMAGE_SWITCHER_FIXED_SLOT_COUNTS[dataType];
  if (dataType === 'WEATHER_STATUS') {
    return buildWeatherSlots(fixedCount ?? 29);
  }
  if (dataType === 'MOON') {
    const moonCount = IMAGE_SWITCHER_MOON_FRAME_COUNTS.includes(
      slotCount as (typeof IMAGE_SWITCHER_MOON_FRAME_COUNTS)[number],
    ) ? slotCount! : IMAGE_SWITCHER_DEFAULT_MOON_FRAME_COUNT;
    return buildMoonSlots(moonCount);
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

  if (def.dataType === 'MOON' && policyType !== 'LUNAR_CYCLE') {
    errors.push('Moon definitions must use the Lunar Cycle policy.');
  }

  if (policyType === 'LUNAR_CYCLE') {
    if (def.dataType !== 'MOON') {
      errors.push('Lunar Cycle policy can only be used with Moon.');
    }
    if (!IMAGE_SWITCHER_MOON_FRAME_COUNTS.includes(
      def.slotCount as (typeof IMAGE_SWITCHER_MOON_FRAME_COUNTS)[number],
    )) {
      errors.push('Moon sets must contain exactly 7, 13, or 30 images.');
    }
    if (ranges.length !== def.slotCount) {
      errors.push(`Expected exactly ${def.slotCount} Moon slots, got ${ranges.length}.`);
    }
    ranges.forEach((slot, index) => {
      if (slot.slotIndex !== index) errors.push(`Moon slot ${index + 1} is out of sequence.`);
      if (slot.code !== undefined || slot.min !== undefined || slot.max !== undefined) {
        errors.push(`Moon slot ${index + 1} must not define a code or numeric range.`);
      }
    });
  } else if (policyType === 'FIXED_CODES') {
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
    if (def.dataType === 'WEATHER_STATUS') {
      for (const condition of ZEP_WEATHER_CONDITION_CODES) {
        const slot = ranges.find(item => item.code === condition.code);
        if (slot && slot.label !== condition.label) {
          errors.push(`Weather code ${condition.code} must be labeled "${condition.label}".`);
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
    if (def.dataType === 'HUMIDITY') errors.push(...auditHumidityRanges(ranges));
    if (def.dataType === 'BIO_CHARGE') errors.push(...auditBioChargeRanges(ranges));
  }

  return errors;
}
