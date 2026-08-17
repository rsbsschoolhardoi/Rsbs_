/**
 * LayersPanel – element list with rename / hide / lock / reorder / duplicate / delete
 */
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Eye, EyeOff, Lock, Unlock, Copy, Trash2, ChevronUp, ChevronDown,
  GripVertical, Pencil, Check, X,
} from 'lucide-react';
import type { StudioElement } from './types';

interface LayersPanelProps {
  elements: StudioElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<StudioElement>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (fromIdx: number, toIdx: number) => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  elements, selectedId, onSelect, onUpdate, onDuplicate, onDelete, onReorder,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  const startRename = (el: StudioElement) => {
    setEditingId(el.id);
    setEditLabel(el.label || el.type);
  };
  const commitRename = (id: string) => {
    if (editLabel.trim()) onUpdate(id, { label: editLabel.trim() });
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-border/60 shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Layers ({elements.length})
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground/50 text-xs px-3">
            Add elements to see layers
          </div>
        ) : (
          <div className="p-1 space-y-0.5">
            {sorted.map((el, idx) => {
              const realIdx = elements.findIndex(e => e.id === el.id);
              return (
                <div
                  key={el.id}
                  draggable
                  onDragStart={() => setDragFrom(idx)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => {
                    if (dragFrom !== null && dragFrom !== idx) {
                      onReorder(dragFrom, idx);
                    }
                    setDragFrom(null);
                  }}
                  onClick={() => onSelect(el.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-100 group',
                    selectedId === el.id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted/40 border border-transparent',
                    el.hidden && 'opacity-40',
                  )}
                >
                  <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0 cursor-grab" />

                  {/* Label / rename input */}
                  <div className="flex-1 min-w-0">
                    {editingId === el.id ? (
                      <input
                        autoFocus
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitRename(el.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onBlur={() => commitRename(el.id)}
                        onClick={e => e.stopPropagation()}
                        className="w-full bg-background border border-primary/40 rounded px-1 py-0 text-xs outline-none"
                      />
                    ) : (
                      <span className="text-xs font-medium truncate block">
                        {el.label || el.type}
                      </span>
                    )}
                    <span className="text-[9px] text-muted-foreground/60 font-mono capitalize">{el.type}</span>
                  </div>

                  {/* Action icons — visible on hover / selected */}
                  <div className={cn(
                    'flex items-center gap-0.5 shrink-0 transition-opacity',
                    selectedId === el.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                  )}>
                    <button
                      onClick={e => { e.stopPropagation(); startRename(el); }}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted/60"
                      title="Rename"
                    ><Pencil className="w-2.5 h-2.5 text-muted-foreground" /></button>

                    <button
                      onClick={e => { e.stopPropagation(); onUpdate(el.id, { hidden: !el.hidden }); }}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted/60"
                      title={el.hidden ? 'Show' : 'Hide'}
                    >{el.hidden ? <EyeOff className="w-2.5 h-2.5 text-muted-foreground" /> : <Eye className="w-2.5 h-2.5 text-muted-foreground" />}</button>

                    <button
                      onClick={e => { e.stopPropagation(); onUpdate(el.id, { locked: !el.locked }); }}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted/60"
                      title={el.locked ? 'Unlock' : 'Lock'}
                    >{el.locked ? <Lock className="w-2.5 h-2.5 text-amber-500" /> : <Unlock className="w-2.5 h-2.5 text-muted-foreground" />}</button>

                    <button
                      onClick={e => { e.stopPropagation(); onDuplicate(el.id); }}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted/60"
                      title="Duplicate"
                    ><Copy className="w-2.5 h-2.5 text-muted-foreground" /></button>

                    <button
                      onClick={e => { e.stopPropagation(); onDelete(el.id); }}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-destructive/20"
                      title="Delete"
                    ><Trash2 className="w-2.5 h-2.5 text-muted-foreground hover:text-destructive" /></button>
                  </div>

                  {/* Up/Down reorder arrows (compact) */}
                  <div className="flex flex-col shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); if (realIdx > 0) onReorder(realIdx, realIdx - 1); }}
                      className="w-4 h-3.5 flex items-center justify-center hover:bg-muted/60 rounded"
                    ><ChevronUp className="w-2.5 h-2.5 text-muted-foreground/60" /></button>
                    <button
                      onClick={e => { e.stopPropagation(); if (realIdx < elements.length - 1) onReorder(realIdx, realIdx + 1); }}
                      className="w-4 h-3.5 flex items-center justify-center hover:bg-muted/60 rounded"
                    ><ChevronDown className="w-2.5 h-2.5 text-muted-foreground/60" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
