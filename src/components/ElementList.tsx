import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import type { WatchFaceElement } from '@/types';
import { AlertTriangle, Eye, EyeOff, GripVertical, Trash2, Edit2, Check, X, Copy } from 'lucide-react';

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
  onDuplicateElement?: (id: string) => void;
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
  onDuplicateElement,
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

  const getElementLabel = (element: WatchFaceElement) => {
    const savedName = element.displayName?.trim() || element.name?.trim();
    if (savedName) return savedName;
    return element.type
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
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

    // Work on a visually sorted copy (highest zIndex first)
    const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);
    const draggedElement = sortedElements[draggedIndex];
    
    let groupElements = [draggedElement];
    if (draggedElement.gaugePairId) {
      groupElements = sortedElements.filter(el => el.gaugePairId === draggedElement.gaugePairId);
    }

    const groupIds = new Set(groupElements.map(el => el.id));
    const remainingElements = sortedElements.filter(el => !groupIds.has(el.id));

    const targetElement = sortedElements[targetIndex];
    
    // Prevent dropping onto another element of the same gauge group
    if (draggedElement.gaugePairId && targetElement.gaugePairId === draggedElement.gaugePairId) {
       handleDragEnd(e);
       return;
    }

    let insertAt = remainingElements.findIndex(el => el.id === targetElement.id);
    if (insertAt === -1) {
       insertAt = remainingElements.length;
    } else {
       if (draggedIndex < targetIndex) {
          insertAt += 1;
       }
    }

    if (draggedElement.gaugePairId && groupElements.length > 1) {
       groupElements.sort((a, b) => {
         if (a.type === 'GAUGE_POINTER' && b.type !== 'GAUGE_POINTER') return -1;
         if (b.type === 'GAUGE_POINTER' && a.type !== 'GAUGE_POINTER') return 1;
         if (a.type === 'IMG_LEVEL' && b.type !== 'IMG_LEVEL') return -1;
         if (b.type === 'IMG_LEVEL' && a.type !== 'IMG_LEVEL') return 1;
         return 0;
       });
    }

    remainingElements.splice(insertAt, 0, ...groupElements);

    // Pass the newly visual-ordered list back to StudioApp to recalculate sequence numbers
    onReorder(remainingElements);
    handleDragEnd(e);
  };

  const startEditing = (element: WatchFaceElement, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(element.id);
    setEditName(getElementLabel(element));
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

  // Visually sort elements so highest zIndex is on Top (Photoshop style)
  const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="text-sm font-medium text-zinc-400 mb-3">
        Elements ({elements.length})
      </h4>
      
      <div className="space-y-1.5 max-h-64 overflow-y-auto overflow-x-hidden pr-1 flex flex-col">
        {sortedElements.map((element, index) => {
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
                'group flex w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-lg border p-2 transition-all',
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
            <div className="flex-1 min-w-0 overflow-hidden">
              {isEditing ? (
                <form onSubmit={saveEditing} className="flex min-w-0 items-center gap-1">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    className="min-w-0 flex-1 bg-zinc-900 border border-zinc-700 text-white text-xs px-1.5 py-0.5 rounded focus:outline-none focus:border-cyan-500"
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
                <p className="flex min-w-0 items-center text-sm font-medium text-white group/name">
                  {element.engraveFrame && <span className="text-amber-400 mr-1">🔗</span>}
                  <span className="min-w-0 flex-1 truncate" title={`[${element.zIndex}] ${getElementLabel(element)}`}>
                    [{element.zIndex}] {getElementLabel(element)}
                  </span>
                  {hasWarning && (
                    <span title={warningTitle} className={cn('inline-flex shrink-0', warningColorClass)}>
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                  )}
                  {onRenameElement && (
                    <button
                      onClick={(e) => startEditing(element, e)}
                      className="shrink-0 p-1 text-zinc-500 transition-colors hover:text-cyan-400"
                      title="Rename layer"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  )}
                </p>
              )}
              <p className="truncate text-[11px] text-zinc-500">
                {element.type}
                {element.subtype && ` • ${element.subtype}`}
              </p>
            </div>

            {/* Visibility toggle */}
            {onToggleVisibility && !isEditing && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleVisibility(element.id); }}
                className={cn(
                  'p-1 rounded-md transition-colors shrink-0',
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

            {/* Duplicate button */}
            {onDuplicateElement && !isEditing && (
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicateElement(element.id); }}
                className="p-1 rounded-md text-zinc-600 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all shrink-0"
                title="Duplicate element"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Delete button */}
            {onDeleteElement && !isEditing && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteElement(element.id); }}
                className="p-1 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
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
