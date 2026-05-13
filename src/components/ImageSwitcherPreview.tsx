/**
 * ImageSwitcherPreview.tsx — Spec 088 Phase B
 * Scrollable horizontal strip showing all baked slot images for a definition.
 */

import type { ImageSwitcherDefinition } from '@/types/imageSwitcher';
import { cn } from '@/lib/utils';

interface Props {
  definition: ImageSwitcherDefinition;
  className?: string;
}

export default function ImageSwitcherPreview({ definition, className }: Props) {
  const { ranges } = definition;

  if (ranges.length === 0) {
    return (
      <div className={cn('text-[10px] text-white/30 italic py-2', className)}>
        No slots defined.
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10', className)}>
      {ranges.map((slot) => (
        <div
          key={slot.slotIndex}
          className="flex flex-col items-center gap-1 shrink-0"
          title={slot.label}
        >
          {slot.dataUrl || slot.baked?.downloadURL ? (
            <img
              src={slot.dataUrl ?? slot.baked?.downloadURL ?? ''}
              alt={slot.label}
              className="w-10 h-10 object-contain rounded bg-black/40 border border-white/10"
            />
          ) : (
            <div className="w-10 h-10 rounded border border-dashed border-white/15 bg-black/20 flex items-center justify-center">
              <span className="text-[7px] text-white/20">—</span>
            </div>
          )}
          <span className="text-[8px] text-white/40 truncate max-w-[42px] text-center leading-tight">
            {slot.label}
          </span>
        </div>
      ))}
    </div>
  );
}
