/**
 * imageSwitcher.ts — Spec 088 Phase B
 * Universal Image Switcher types.
 */

// ── Policy types ──────────────────────────────────────────────────────────────

export type PolicyType =
  | 'FIXED_CODES'       // weather (29 codes), moon (8 codes) — exact integer code → slot
  | 'PERCENT_RANGES'    // battery — 0–100% ordered stops
  | 'DYNAMIC_RANGES'    // heart — profile-derived heart-rate zones
  | 'ABSOLUTE_RANGES';  // steps/AQI/UV/stress — fixed numeric min..max bands

// ── Storage references ────────────────────────────────────────────────────────

export interface StorageRef {
  storagePath: string;   // Firebase Storage path
  downloadURL: string;   // CDN download URL (cached, use for preview + ZPK)
  fileHash: string;      // SHA-256 hex of content at time of upload
  bakedVersion: number;  // increments on rebake; 0 = never baked
}

// ── Range slot ────────────────────────────────────────────────────────────────

export interface RangeSlot {
  slotIndex: number;
  label: string;

  // FIXED_CODES only
  code?: number;        // exact weather code 0–28, moon phase 0–7, etc.

  // PERCENT_RANGES / DYNAMIC_RANGES / ABSOLUTE_RANGES
  min?: number;         // inclusive lower bound
  max?: number;         // inclusive upper bound

  // Optional: user-provided source HTML/SVG for this slot image
  source?: StorageRef;  // nullable — slots may be upload-only (no source)
  baked?: StorageRef;   // the baked PNG for this slot

  // Local offline cache — populated when pulled from Storage
  dataUrl?: string;

  // Spec 089 — source HTML roundtrip (in-memory + IDB; persisted via per-slot
  // Storage upload, NOT inlined in Firestore — see imageSwitcherSync.ts).
  sourceHtml?: string;  // editable truth — raw HTML/SVG pasted by user
  sourceHash?: string;  // SHA-256 of sourceHtml — used to detect stale bake + skip-upload-if-unchanged
}

// ── User profile (for DYNAMIC_RANGES / HEART) ─────────────────────────────────

export interface UserProfile {
  restingHeartRate: number;   // bpm
  maxHeartRate: number;       // bpm
  age?: number;
  fitnessTier?: 'beginner' | 'intermediate' | 'advanced';
}

// ── Heart zone (computed from UserProfile) ────────────────────────────────────

export interface HeartZone {
  zoneIndex: number;
  label: string;  // 'Resting' | 'Fat Burn' | 'Cardio' | 'Peak' | 'Max'
  min: number;
  max: number;
}

// ── Image Switcher definition (stored in IDB + Firestore) ─────────────────────

export interface ImageSwitcherDefinition {
  id: string;              // nanoid
  name: string;
  dataType: string;        // 'BATTERY' | 'HEART' | 'WEATHER_CURRENT' | etc.
  policyType: PolicyType;
  slotCount: number;       // resolved: 29 for weather, 8 for moon, user-set for others
  ranges: RangeSlot[];
  userProfile?: UserProfile;  // only present for DYNAMIC_RANGES
  createdAt: number;
  updatedAt: number;
}

// ── Resolver output ───────────────────────────────────────────────────────────

export interface ResolveResult {
  slotIndex: number;
  downloadURL: string | null;  // CDN URL from slot.baked.downloadURL (online)
  dataUrl?: string;            // IDB-cached dataUrl (offline fallback)
  slot: RangeSlot;
}
