/**
 * ImageSwitcherLab.tsx — Spec 088 Phase B
 * Full Image Switcher editor — create / edit definitions, upload slot PNGs, save to IDB + cloud.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ImageSwitcherDefinition, RangeSlot, UserProfile } from '@/types/imageSwitcher';
import {
  loadSwitcherDefinitions,
  saveSwitcherDefinition,
  deleteSwitcherDefinition,
} from '@/lib/imageSwitcherStore';
import {
  buildDefaultSlots,
  buildHeartZones,
  validateDefinition,
} from '@/lib/imageSwitcherResolver';
import {
  IMAGE_SWITCHER_POLICY,
  getDataTypeLabel,
} from '@/lib/elementDataRules';
import { pushSwitcherDefinition, deleteSwitcherFromCloud } from '@/lib/imageSwitcherSync';
import { renderHtmlToDataUrl } from '@/lib/customIconStore';
import { sha256Hex } from '@/lib/firebaseStorageClient';
import ImageSwitcherSlotRow from './ImageSwitcherSlotRow';
import ImageSwitcherPreview from './ImageSwitcherPreview';
import { cn } from '@/lib/utils';

// ── Supported data types for Image Switcher ───────────────────────────────────

const SWITCHER_DATA_TYPES = [
  'BATTERY', 'HEART', 'WEATHER_CURRENT', 'WEATHER_STATUS',
  'STEP', 'CAL', 'DISTANCE', 'STAND', 'PAI', 'PAI_WEEKLY',
  'FAT_BURN', 'STRESS', 'SPO2', 'AQI', 'UVI', 'HUMIDITY',
];

function policyLabel(policy: string): string {
  const map: Record<string, string> = {
    FIXED_CODES: 'Fixed Codes',
    PERCENT_RANGES: 'Percent Ranges (0–100%)',
    DYNAMIC_RANGES: 'Dynamic Zones (Heart Rate)',
    ABSOLUTE_RANGES: 'Absolute Ranges',
  };
  return map[policy] ?? policy;
}

function makeId(): string {
  return crypto.randomUUID();
}

// ── Default user profile ──────────────────────────────────────────────────────

const DEFAULT_PROFILE: UserProfile = {
  restingHeartRate: 65,
  maxHeartRate: 185,
  age: 30,
  fitnessTier: 'intermediate',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ImageSwitcherLab() {
  const [defs, setDefs] = useState<ImageSwitcherDefinition[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Editor state
  const [name, setName] = useState('');
  const [dataType, setDataType] = useState('BATTERY');
  const [slots, setSlots] = useState<RangeSlot[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Load saved definitions
  const reload = useCallback(async () => {
    const all = await loadSwitcherDefinitions();
    setDefs(all.sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Reset editor to blank new definition
  const resetEditor = useCallback(() => {
    setEditingId(null);
    setName('');
    setDataType('BATTERY');
    setSlots(buildDefaultSlots('BATTERY'));
    setProfile(DEFAULT_PROFILE);
    setErrors([]);
    setSaveMsg('');
  }, []);

  // When dataType changes, rebuild slots unless we're editing an existing def
  useEffect(() => {
    if (!editingId) {
      setSlots(buildDefaultSlots(dataType, IMAGE_SWITCHER_POLICY[dataType] === 'DYNAMIC_RANGES' ? profile : undefined));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataType]);

  const policyType = IMAGE_SWITCHER_POLICY[dataType] ?? 'ABSOLUTE_RANGES';
  const isFixed = policyType === 'FIXED_CODES';
  const isHeart = policyType === 'DYNAMIC_RANGES';

  // Slot manipulation
  const updateSlot = (i: number, patch: Partial<RangeSlot>) => {
    setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  };
  const removeSlot = (i: number) => {
    setSlots(prev => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, slotIndex: idx })));
  };
  const addSlot = () => {
    const last = slots[slots.length - 1];
    setSlots(prev => [...prev, {
      slotIndex: prev.length,
      label: `Slot ${prev.length}`,
      min: last ? (last.max ?? 0) + 1 : 0,
      max: last ? (last.max ?? 0) + 10 : 10,
    }]);
  };

  // Auto-suggest heart zones
  const suggestZones = () => {
    const zones = buildHeartZones(profile);
    setSlots(zones.map(z => ({
      slotIndex: z.zoneIndex,
      label: z.label,
      min: z.min,
      max: z.max,
    })));
  };

  // Load a definition for editing
  const startEdit = (def: ImageSwitcherDefinition) => {
    setEditingId(def.id);
    setName(def.name);
    setDataType(def.dataType);
    setSlots(def.ranges.map(r => ({ ...r })));
    setProfile(def.userProfile ?? DEFAULT_PROFILE);
    setErrors([]);
    setSaveMsg('');
  };

  // Save
  const handleSave = async () => {
    const def: ImageSwitcherDefinition = {
      id: editingId ?? makeId(),
      name: name.trim(),
      dataType,
      policyType,
      slotCount: slots.length,
      ranges: slots,
      userProfile: isHeart ? profile : undefined,
      createdAt: editingId ? (defs.find(d => d.id === editingId)?.createdAt ?? Date.now()) : Date.now(),
      updatedAt: Date.now(),
    };

    const validationErrors = validateDefinition(def);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors([]);
    setSaveMsg('');
    try {
      await saveSwitcherDefinition(def);
      // Fire-and-forget cloud sync
      pushSwitcherDefinition(def).catch(console.warn);
      setSaveMsg('✓ Saved');
      await reload();
      resetEditor();
    } catch (err) {
      setSaveMsg(`✗ ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  // Bake All slots that have sourceHtml
  const [bakingAll, setBakingAll] = useState(false);
  const [bakeAllMsg, setBakeAllMsg] = useState('');
  const handleBakeAll = async () => {
    const htmlSlots = slots.filter(s => (s.sourceHtml ?? '').trim());
    if (htmlSlots.length === 0) { setBakeAllMsg('No slots have HTML source'); return; }
    setBakingAll(true);
    setBakeAllMsg(`Baking 0 / ${htmlSlots.length}…`);
    let done = 0;
    const updated = [...slots];
    for (const slot of htmlSlots) {
      try {
        const dataUrl = await renderHtmlToDataUrl(slot.sourceHtml!, 128);
        const hash = await sha256Hex(slot.sourceHtml!);
        const idx = updated.findIndex(s => s.slotIndex === slot.slotIndex);
        if (idx >= 0) updated[idx] = { ...updated[idx], dataUrl, sourceHash: hash };
      } catch { /* skip failed slot */ }
      done++;
      setBakeAllMsg(`Baking ${done} / ${htmlSlots.length}…`);
    }
    setSlots(updated);
    setBakingAll(false);
    setBakeAllMsg(`✓ Baked ${done} slot(s)`);
    setTimeout(() => setBakeAllMsg(''), 3000);
  };

  // Download definition as JSON file
  const handleDownload = () => {
    const def = { id: editingId ?? makeId(), name: name.trim() || 'switcher', dataType, policyType, slotCount: slots.length, ranges: slots };
    const blob = new Blob([JSON.stringify(def, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${def.name.replace(/\s+/g, '_')}.switcher.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // Upload definition from JSON file
  const uploadRef = useRef<HTMLInputElement>(null);
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        // Strip BOM and trim before parsing
        const text = ((evt.target?.result as string) ?? '').replace(/^\uFEFF/, '').trim();
        const def = JSON.parse(text) as Partial<ImageSwitcherDefinition>;
        if (def.ranges && Array.isArray(def.ranges) && def.ranges.length > 0) {
          setEditingId(def.id ?? null);
          setName(def.name ?? '');
          if (def.dataType) setDataType(def.dataType);
          setSlots((def.ranges as RangeSlot[]).map(r => ({ ...r })));
          if (def.userProfile) setProfile(def.userProfile);
          setSaveMsg('✓ Loaded');
          setErrors([]);
        } else {
          setSaveMsg('✗ No ranges found in file');
        }
      } catch (err) {
        setSaveMsg(`✗ Parse error: ${(err as Error).message?.slice(0, 60)}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Delete
  const handleDelete = async (id: string) => {
    // Read slotCount from already-loaded state BEFORE deleting from IDB, so the
    // cloud delete can build deterministic storage paths without a Firestore read.
    const slotCount = defs.find(d => d.id === id)?.slotCount ?? 0;
    await deleteSwitcherDefinition(id);
    deleteSwitcherFromCloud(id, slotCount).catch(console.warn);
    await reload();
    if (editingId === id) resetEditor();
  };

  return (
    <div className="space-y-4 text-white">
      {/* ── Editor ───────────────────────────────────────────────────────── */}
      <div className="bg-white/3 border border-white/8 rounded-lg p-3 space-y-3">
        <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
          {editingId ? 'Edit' : 'Create'} Image Switcher
        </h3>

        {/* Name + Data Type */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-white/50 mb-1 block">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Battery Pack v1"
              className="h-7 text-xs bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-white/50 mb-1 block">Data Type</label>
            <Select value={dataType} onValueChange={setDataType}>
              <SelectTrigger className="h-7 text-xs bg-zinc-800 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SWITCHER_DATA_TYPES.map((dt) => (
                  <SelectItem key={dt} value={dt}>{getDataTypeLabel(dt)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Policy label */}
        <p className="text-[10px] text-white/35">
          Policy: <span className="text-white/55">{policyLabel(policyType)}</span>
        </p>

        {/* Heart profile inputs */}
        {isHeart && (
          <div className="border border-white/8 rounded p-2 space-y-2 bg-black/20">
            <p className="text-[10px] text-white/50 font-medium">Heart Rate Profile</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-white/40 block mb-0.5">Resting HR (bpm)</label>
                <Input
                  type="number"
                  value={profile.restingHeartRate}
                  onChange={(e) => setProfile(p => ({ ...p, restingHeartRate: Number(e.target.value) }))}
                  className="h-6 text-[11px] bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-[9px] text-white/40 block mb-0.5">Max HR (bpm)</label>
                <Input
                  type="number"
                  value={profile.maxHeartRate}
                  onChange={(e) => setProfile(p => ({ ...p, maxHeartRate: Number(e.target.value) }))}
                  className="h-6 text-[11px] bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-[9px] text-white/40 block mb-0.5">Age</label>
                <Input
                  type="number"
                  value={profile.age ?? ''}
                  onChange={(e) => setProfile(p => ({ ...p, age: Number(e.target.value) || undefined }))}
                  className="h-6 text-[11px] bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-[9px] text-white/40 block mb-0.5">Fitness Tier</label>
                <Select
                  value={profile.fitnessTier ?? 'intermediate'}
                  onValueChange={(v) => setProfile(p => ({ ...p, fitnessTier: v as UserProfile['fitnessTier'] }))}
                >
                  <SelectTrigger className="h-6 text-[11px] bg-zinc-800 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <button
              onClick={suggestZones}
              className="text-[10px] px-2 py-1 rounded border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors"
            >
              Auto-suggest zones
            </button>
          </div>
        )}

        {/* Slot table */}
        <div className="overflow-x-auto rounded border border-white/8">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                <th className="py-1.5 px-2 text-[9px] text-white/35 w-8">#</th>
                <th className="py-1.5 px-1.5 text-[9px] text-white/35">Label</th>
                {isFixed
                  ? <th className="py-1.5 px-1.5 text-[9px] text-white/35 w-12">Code</th>
                  : <>
                      <th className="py-1.5 px-1 text-[9px] text-white/35 w-16">Min</th>
                      <th className="py-1.5 px-1 text-[9px] text-white/35 w-16">Max</th>
                    </>
                }
                <th className="py-1.5 px-1.5 text-[9px] text-white/35">Image</th>
                <th className="w-7" />
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, i) => (
                <ImageSwitcherSlotRow
                  key={slot.slotIndex}
                  slot={slot}
                  policyType={policyType}
                  isFixed={isFixed}
                  onUpdate={(patch) => updateSlot(i, patch)}
                  onRemove={isFixed ? undefined : () => removeSlot(i)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Add slot */}
        {!isFixed && (
          <button
            onClick={addSlot}
            className="text-[10px] px-2 py-1 rounded border border-white/15 bg-white/5 hover:bg-white/10 text-white/55 hover:text-white transition-colors"
          >
            + Add Slot
          </button>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="space-y-0.5">
            {errors.map((e, i) => (
              <p key={i} className="text-[10px] text-red-400">{e}</p>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className={cn(
              'text-[11px] px-3 py-1.5 rounded border font-medium transition-colors',
              saving || !name.trim()
                ? 'border-white/10 text-white/30 cursor-not-allowed'
                : 'border-cyan-500/60 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300',
            )}
          >
            {saving ? 'Saving…' : editingId ? 'Update Switcher' : 'Save Switcher'}
          </button>
          <button
            onClick={handleBakeAll}
            disabled={bakingAll || !slots.some(s => (s.sourceHtml ?? '').trim())}
            className={cn(
              'text-[11px] px-2.5 py-1.5 rounded border font-medium transition-colors',
              bakingAll || !slots.some(s => (s.sourceHtml ?? '').trim())
                ? 'border-white/10 text-white/30 cursor-not-allowed'
                : 'border-amber-400/50 bg-amber-500/12 hover:bg-amber-500/22 text-amber-200',
            )}
          >
            {bakingAll ? bakeAllMsg : 'Bake All'}
          </button>
          <button
            onClick={handleDownload}
            className="text-[11px] px-2.5 py-1.5 rounded border border-white/15 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            ↓ Export JSON
          </button>
          <button
            onClick={() => uploadRef.current?.click()}
            className="text-[11px] px-2.5 py-1.5 rounded border border-white/15 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            ↑ Import JSON
          </button>
          <input ref={uploadRef} type="file" accept=".json" onChange={handleUpload} className="hidden" />
          {editingId && (
            <button
              onClick={resetEditor}
              className="text-[11px] px-2 py-1.5 rounded border border-white/15 bg-white/5 hover:bg-white/10 text-white/50 transition-colors"
            >
              Cancel
            </button>
          )}
          {bakeAllMsg && !bakingAll && (
            <span className={cn('text-[10px]', bakeAllMsg.startsWith('✓') ? 'text-green-400' : 'text-amber-400')}>
              {bakeAllMsg}
            </span>
          )}
          {saveMsg && (
            <span className={cn('text-[10px]', saveMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400')}>
              {saveMsg}
            </span>
          )}
        </div>
      </div>

      {/* ── Saved definitions list ────────────────────────────────────────── */}
      {defs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            Saved Definitions
          </h3>
          {defs.map((def) => (
            <div
              key={def.id}
              className={cn(
                'border rounded-lg p-2.5 space-y-1.5 transition-colors',
                editingId === def.id
                  ? 'border-cyan-500/40 bg-cyan-500/5'
                  : 'border-white/8 bg-white/2 hover:bg-white/4',
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-white">{def.name}</span>
                  <span className="ml-2 text-[9px] text-white/35">
                    {getDataTypeLabel(def.dataType)} / {policyLabel(def.policyType)} / {def.slotCount} slots
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => startEdit(def)}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-white/15 bg-white/5 hover:bg-white/10 text-white/55 hover:text-white transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(def.id)}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400/70 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <ImageSwitcherPreview definition={def} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
