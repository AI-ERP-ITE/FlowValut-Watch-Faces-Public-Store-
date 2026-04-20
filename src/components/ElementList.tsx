import { cn } from '@/lib/utils';
import type { WatchFaceElement } from '@/types';
import { Eye, EyeOff, GripVertical, Trash2 } from 'lucide-react';

interface ElementListProps {
  elements: WatchFaceElement[];
  onToggleVisibility?: (id: string) => void;
  onReorder?: (elements: WatchFaceElement[]) => void;
  onDeleteElement?: (id: string) => void;
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
  className?: string;
}

export function ElementList({
  elements,
  onToggleVisibility,
  onReorder,
  onDeleteElement,
  selectedElementId,
  onSelectElement,
  className,
}: ElementListProps) {
  const getElementIcon = (element: WatchFaceElement) => {
    if (element.engraveFrame) return '⬚';
    switch (element.type) {
      case 'TIME_POINTER':
        return '🕐';
      case 'IMG_LEVEL':
        return '📊';
      case 'TEXT':
        return '📝';
      case 'IMG':
        return '🖼️';
      case 'ARC_PROGRESS':
        return '⭕';
      case 'FILL_RECT':
        return '▬';
      default:
        return '⚙️';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="text-sm font-medium text-zinc-400 mb-3">
        Elements ({elements.length})
      </h4>
      
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {elements.map((element) => (
          <div
            key={element.id}
            onClick={() => onSelectElement?.(element.id)}
            className={cn(
              'group flex items-center gap-3 p-2.5 rounded-lg border transition-all',
              element.engraveFrame
                ? selectedElementId === element.id
                  ? 'bg-amber-500/10 border-amber-500 border-l-[3px] cursor-default'
                  : 'bg-[#1A1A1A] border-zinc-800 border-l-[3px] border-l-amber-500/60 hover:border-zinc-700'
                : selectedElementId === element.id
                  ? 'bg-cyan-500/10 border-cyan-500 cursor-default'
                  : 'bg-[#1A1A1A] border-zinc-800 hover:border-zinc-700',
              onSelectElement && 'cursor-pointer'
            )}
          >
            {/* Drag handle */}
            {onReorder && (
              <button className="text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing">
                <GripVertical className="h-4 w-4" />
              </button>
            )}

            {/* Element icon */}
            <span className="text-lg">{getElementIcon(element)}</span>

            {/* Element info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {element.engraveFrame && <span className="text-amber-400 mr-1">🔗</span>}
                {element.name}
              </p>
              <p className="text-xs text-zinc-500">
                {element.type}
                {element.subtype && ` • ${element.subtype}`}
              </p>
            </div>

            {/* Position info */}
            <div className="text-xs text-zinc-600 hidden sm:block">
              {element.bounds.x}, {element.bounds.y}
            </div>

            {/* Visibility toggle */}
            {onToggleVisibility && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleVisibility(element.id); }}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  element.visible
                    ? 'text-cyan-500 hover:bg-cyan-500/10'
                    : 'text-zinc-600 hover:bg-zinc-800'
                )}
              >
                {element.visible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
            )}

            {/* Delete button */}
            {onDeleteElement && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteElement(element.id); }}
                className="p-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                title="Delete element"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {elements.length === 0 && (
        <div className="text-center py-8 text-zinc-500">
          <p className="text-sm">No elements detected yet</p>
          <p className="text-xs mt-1">Upload images to analyze</p>
        </div>
      )}
    </div>
  );
}
