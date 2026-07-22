import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import type { WatchFaceElement } from '@/types';
import { AlertTriangle, Eye, EyeOff, GripVertical, Trash2, Edit2, Check, X } from 'lucide-react';

interface ElementWarningInfo {
  hasFlickerRisk: boolean;
  ratio: number;
  severity: 'none' | 'medium' | 'high';
}

interface ElementListProps {
  elements: WatchFaceElement[];
  elementWarnings?: Record<string, ElementWarningInfo>;
  onToggleVisibility?: (id: string) => void;
  onReorder?: (elements: WatchFaceElement[]) => void;
  onRenameElement?: (id: string, newName: string) => void;
  onDeleteElement?: (id: string) => void;
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
  /** IDs of elements that are part of the current group selection (gauge siblings). */
  extraSelectedIds?: string[];
  /** Ctrl+click callback — toggle an element in/out of the group selection. */
  onMultiToggle?: (id: string) => void;
  className?: string;
}

export function ElementList({
  elements,
  elementWarnings,
  onToggleVisibility,
  onReorder,
  onRenameElement,
  onDeleteElement,
  selectedElementId,
  onSelectElement,
  extraSelectedIds,
  onMultiToggle,
  className,
}: ElementListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Requires a small delay for the UI to update correctly during drag
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (index !== draggedIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex || !onReorder) {
      handleDragEnd(e);
      return;
    }

    const newElements = [...elements];
    const [draggedElement] = newElements.splice(draggedIndex, 1);
    newElements.splice(targetIndex, 0, draggedElement);
    
    // Update zIndex sequentially based on array order
    newElements.forEach((el, idx) => {
      el.zIndex = idx;
    });

    onReorder(newElements);
    handleDragEnd(e);
  };

  const startEditing = (element: WatchFaceElement, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(element.id);
    setEditName(element.displayName || element.name);
  };

  const saveEditing = (e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editingId && onRenameElement) {
      onRenameElement(editingId, editName);
    }
    setEditingId(null);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="text-sm font-medium text-zinc-400 mb-3">
        Elements ({elements.length})
      </h4>
      
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 flex flex-col">
        {[...elements].reverse().map((element, reversedIndex) => {
          const index = elements.length - 1 - reversedIndex;
          const warning = elementWarnings?.[element.id];
          const hasWarning = !!warning?.hasFlickerRisk;
          const warningColorClass = warning?.severity === 'high' ? 'text-red-400' : 'text-amber-400';
          const warningTitle = warning
            ? `Flicker Risk: contains low RGB values (1-46)\nMay appear unstable or disappear on device\nAffected ratio: ${(warning.ratio * 100).toFixed(1)}%`
            : '';
          const isPrimary = selectedElementId === element.id;
          const isExtra = !isPrimary && (extraSelectedIds ?? []).includes(element.id);
          const isDraggedOver = dragOverIndex === index;
          const isEditing = editingId === element.id;

          return (
            <div
              key={element.id}
              draggable={!!onReorder}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragOver={(e) => e.preventDefault()}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, index)}
              onClick={(e) => {
                if (isEditing) return;
                if ((e.ctrlKey || e.metaKey) && onMultiToggle) {
                  onMultiToggle(element.id);
                } else {
                  onSelectElement?.(element.id);
                }
              }}
              className={cn(
                'group flex items-center gap-3 p-2.5 rounded-lg border transition-all',
                isDraggedOver ? 'border-t-2 border-t-cyan-500' : '',
                element.engraveFrame
                  ? isPrimary
                    ? 'bg-amber-500/10 border-amber-500 border-l-[3px] cursor-default'
                    : 'bg-[#1A1A1A] border-zinc-800 border-l-[3px] border-l-amber-500/60 hover:border-zinc-700'
                  : isPrimary
                    ? 'bg-cyan-500/10 border-cyan-500 cursor-default'
                    : isExtra
                      ? 'bg-cyan-500/5 border-cyan-500/40 border-dashed shadow-[0_0_6px_1px_rgba(0,200,255,0.18)]'
                      : 'bg-[#1A1A1A] border-zinc-800 hover:border-zinc-700',
                (onSelectElement && !isEditing) ? 'cursor-pointer' : ''
              )}
            >
            {/* Drag handle */}
            {onReorder && (
              <button className="text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing shrink-0">
                <GripVertical className="h-4 w-4" />
              </button>
            )}

            {/* Element icon */}
            <span className="text-lg shrink-0">{getElementIcon(element)}</span>

            {/* Element info */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <form onSubmit={saveEditing} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs px-1.5 py-0.5 rounded focus:outline-none focus:border-cyan-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button type="submit" className="text-green-500 hover:text-green-400 shrink-0">
                    <Check className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={cancelEditing} className="text-red-500 hover:text-red-400 shrink-0">
                    <X className="h-3 w-3" />
                  </button>
                </form>
              ) : (
                <p className="text-sm font-medium text-white truncate flex items-center group/name">
                  {element.engraveFrame && <span className="text-amber-400 mr-1">🔗</span>}
                  <span className="truncate">{element.displayName || element.name}</span>
                  {hasWarning && (
                    <span title={warningTitle} className={cn('inline-flex align-middle ml-2 shrink-0', warningColorClass)}>
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                  )}
                  {onRenameElement && (
                    <button
                      onClick={(e) => startEditing(element, e)}
                      className="ml-2 text-zinc-500 hover:text-cyan-400 opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0"
                      title="Rename layer"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  )}
                </p>
              )}
              <p className="text-xs text-zinc-500">
                {element.type}
                {element.subtype && ` • ${element.subtype}`}
              </p>
            </div>

            {/* Position info */}
            <div className="text-xs text-zinc-600 hidden sm:block shrink-0">
              {element.bounds.x}, {element.bounds.y}
            </div>

            {/* Visibility toggle */}
            {onToggleVisibility && !isEditing && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleVisibility(element.id); }}
                className={cn(
                  'p-1.5 rounded-md transition-colors shrink-0',
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
            {onDeleteElement && !isEditing && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteElement(element.id); }}
                className="p-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                title="Delete element"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            </div>
          );
        })}
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
