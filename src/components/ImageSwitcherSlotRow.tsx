/**
 * ImageSwitcherSlotRow.tsx — Spec 088 Phase B
 * Single row in the ImageSwitcherLab slot table.
 */

import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import type { RangeSlot } from '@/types/imageSwitcher';

interface Props {
  slot: RangeSlot;
  policyType: string;
  isFixed: boolean;   // FIXED_CODES — no add/remove, no min/max
  onUpdate: (patch: Partial<RangeSlot>) => void;
  onRemove?: () => void;
}

export default function ImageSwitcherSlotRow({ slot, policyType, isFixed, onUpdate, onRemove }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) onUpdate({ dataUrl });
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  return (
    <tr className="border-b border-white/5 hover:bg-white/3 transition-colors">
      {/* Slot # */}
      <td className="py-1.5 px-2 text-[10px] text-white/40 w-8 text-center">
        {slot.slotIndex}
      </td>

      {/* Label */}
      <td className="py-1 px-1.5">
        {isFixed ? (
          <span className="text-[11px] text-white/70">{slot.label}</span>
        ) : (
          <Input
            value={slot.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="h-6 text-[11px] bg-white/5 border-white/10 text-white px-1.5 w-full"
          />
        )}
      </td>

      {/* Code (FIXED_CODES only) */}
      {policyType === 'FIXED_CODES' && (
        <td className="py-1 px-1.5 text-[10px] text-white/40 w-12 text-center">
          {slot.code ?? '—'}
        </td>
      )}

      {/* Min / Max (ranges) */}
      {policyType !== 'FIXED_CODES' && (
        <>
          <td className="py-1 px-1 w-16">
            <Input
              type="number"
              value={slot.min ?? ''}
              onChange={(e) => onUpdate({ min: Number(e.target.value) })}
              className="h-6 text-[11px] bg-white/5 border-white/10 text-white px-1.5"
            />
          </td>
          <td className="py-1 px-1 w-16">
            <Input
              type="number"
              value={slot.max ?? ''}
              onChange={(e) => onUpdate({ max: Number(e.target.value) })}
              className="h-6 text-[11px] bg-white/5 border-white/10 text-white px-1.5"
            />
          </td>
        </>
      )}

      {/* Image */}
      <td className="py-1 px-1.5 w-28">
        <div className="flex items-center gap-1.5">
          {slot.dataUrl ? (
            <img
              src={slot.dataUrl}
              alt={`slot ${slot.slotIndex}`}
              className="w-8 h-8 rounded object-contain bg-black/30 border border-white/10"
            />
          ) : (
            <div className="w-8 h-8 rounded border border-dashed border-white/20 bg-black/20 flex items-center justify-center">
              <span className="text-[8px] text-white/25">PNG</span>
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] px-1.5 py-0.5 rounded border border-white/20 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            {slot.dataUrl ? 'Replace' : 'Upload'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </td>

      {/* Remove */}
      <td className="py-1 px-1 w-7">
        {!isFixed && onRemove && (
          <button
            onClick={onRemove}
            className="text-white/30 hover:text-red-400 transition-colors text-[11px] w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/10"
            title="Remove slot"
          >
            ✕
          </button>
        )}
      </td>
    </tr>
  );
}
