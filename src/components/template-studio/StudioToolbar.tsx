/**
 * StudioToolbar V2 – compact, professional, Figma-like
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Undo2, Redo2, ZoomIn, ZoomOut, Maximize, Shrink, Scan,
  Copy, Clipboard, Trash2, ChevronsUp, ChevronsDown,
  AlignLeft, AlignCenter, AlignRight,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  Eye, Save, CheckCircle2, Loader2, ArrowLeft, Wand2,
  Group, Ungroup, Layers, PanelLeft, PanelRight,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import type { StudioElement } from './types';

export type SaveStatus = 'idle' | 'saving' | 'saved';

interface StudioToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoom: (z: number | 'fit' | 'width' | 'actual') => void;
  selectedElement: StudioElement | null;
  hasMultiSelect: boolean;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onAlign: (alignment: string) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onPreview: () => void;
  onSave: () => void;
  onBack: () => void;
  onToggleLayers: () => void;
  onToggleRightPanel?: () => void;
  showRightPanel?: boolean;
  saveStatus: SaveStatus;
  templateName: string;
  hasUnsavedChanges?: boolean;
}



const Sep = () => <div className="w-px h-5 bg-border/50 mx-0.5 shrink-0" />;

const TB: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  title: string;
  className?: string;
  children: React.ReactNode;
}> = ({ onClick, disabled, title, className, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      'flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-30 disabled:pointer-events-none shrink-0',
      className,
    )}
  >
    {children}
  </button>
);

export const StudioToolbar: React.FC<StudioToolbarProps> = ({
  canUndo, canRedo, onUndo, onRedo,
  zoom, onZoom,
  selectedElement, hasMultiSelect,
  onCopy, onPaste, onDuplicate, onDelete,
  onBringForward, onSendBackward, onAlign,
  onGroup, onUngroup,
  onPreview, onSave, onBack, onToggleLayers,
  onToggleRightPanel, showRightPanel,
  saveStatus, templateName, hasUnsavedChanges,
}) => {
  const has = !!selectedElement || hasMultiSelect;
  const ZOOM_PRESETS = [10, 25, 50, 75, 100, 125, 150, 200, 300, 400, 500];

  return (
    <div className="flex items-center h-10 px-2 gap-0.5 border-b border-border/60 bg-card/95 backdrop-blur shrink-0 overflow-x-auto">
      {/* Back */}
      <TB onClick={onBack} title="Back to Templates">
        <ArrowLeft className="w-3.5 h-3.5" />
      </TB>

      <Sep />

      {/* Template name */}
      <span className="text-xs font-semibold text-foreground/80 truncate max-w-[120px] shrink-0 hidden md:block px-1">
        {templateName || 'Untitled'}
      </span>

      <Sep />

      {/* Layers toggle */}
      <TB onClick={onToggleLayers} title="Toggle Layers Panel">
        <Layers className="w-3.5 h-3.5" />
      </TB>
      {onToggleRightPanel && (
        <TB onClick={onToggleRightPanel} title="Toggle Properties Panel" className={showRightPanel ? 'text-primary bg-primary/10' : ''}>
          <PanelRight className="w-3.5 h-3.5" />
        </TB>
      )}

      <Sep />

      {/* Undo / Redo */}
      <TB disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)"><Undo2 className="w-3.5 h-3.5" /></TB>
      <TB disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl+Y)"><Redo2 className="w-3.5 h-3.5" /></TB>

      <Sep />

      {/* Edit actions */}
      <TB disabled={!has}   onClick={onCopy}      title="Copy (Ctrl+C)">     <Copy      className="w-3.5 h-3.5" /></TB>
      <TB                   onClick={onPaste}      title="Paste (Ctrl+V)">    <Clipboard className="w-3.5 h-3.5" /></TB>
      <TB disabled={!has}   onClick={onDuplicate}  title="Duplicate (Ctrl+D)"><Copy      className="w-3.5 h-3.5" /></TB>
      <TB disabled={!has}   onClick={onDelete}     title="Delete"
          className="hover:text-destructive hover:bg-destructive/10">        <Trash2    className="w-3.5 h-3.5" /></TB>

      <Sep />

      {/* Z-order */}
      <TB disabled={!has} onClick={onBringForward} title="Bring Forward"><ChevronsUp   className="w-3.5 h-3.5" /></TB>
      <TB disabled={!has} onClick={onSendBackward} title="Send Backward"><ChevronsDown className="w-3.5 h-3.5" /></TB>

      <Sep />

      {/* Group / Ungroup */}
      <TB disabled={!hasMultiSelect} onClick={onGroup}   title="Group (Ctrl+G)">  <Group   className="w-3.5 h-3.5" /></TB>
      <TB disabled={!has}            onClick={onUngroup} title="Ungroup">          <Ungroup className="w-3.5 h-3.5" /></TB>

      <Sep />

      {/* Alignment — only shown when something selected */}
      {has && (<>
        {[
          { k:'left',    icon:<AlignLeft                       className="w-3.5 h-3.5"/>, t:'Align Left'        },
          { k:'centerH', icon:<AlignCenter                     className="w-3.5 h-3.5"/>, t:'Center Horizontal' },
          { k:'right',   icon:<AlignRight                      className="w-3.5 h-3.5"/>, t:'Align Right'       },
          { k:'top',     icon:<AlignStartVertical              className="w-3.5 h-3.5"/>, t:'Align Top'         },
          { k:'centerV', icon:<AlignCenterVertical             className="w-3.5 h-3.5"/>, t:'Center Vertical'   },
          { k:'bottom',  icon:<AlignEndVertical                className="w-3.5 h-3.5"/>, t:'Align Bottom'      },
          { k:'distH',   icon:<AlignHorizontalDistributeCenter className="w-3.5 h-3.5"/>, t:'Distribute H'      },
          { k:'distV',   icon:<AlignVerticalDistributeCenter   className="w-3.5 h-3.5"/>, t:'Distribute V'      },
        ].map(a => (
          <TB key={a.k} onClick={() => onAlign(a.k)} title={a.t}>{a.icon}</TB>
        ))}
        <Sep />
      </>)}

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Zoom */}
      <TB onClick={() => onZoom(Math.max(10, zoom - 10))} title="Zoom Out"><ZoomOut className="w-3.5 h-3.5" /></TB>
      <Select value={String(zoom)} onValueChange={v => {
        if (v === 'fit' || v === 'width' || v === 'actual') { onZoom(v); return; }
        onZoom(parseInt(v) || 100);
      }}>
        <SelectTrigger className="h-7 w-[76px] text-[11px] rounded-md border-border/60 bg-muted/30 px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="text-xs max-h-72">
          {ZOOM_PRESETS.map(z => <SelectItem key={z} value={String(z)} className="text-xs">{z}%</SelectItem>)}
          <SelectItem value="fit" className="text-xs">Fit Page</SelectItem>
          <SelectItem value="width" className="text-xs">Fit Width</SelectItem>
          <SelectItem value="actual" className="text-xs">Actual Size</SelectItem>
        </SelectContent>
      </Select>
      <TB onClick={() => onZoom(Math.min(500, zoom + 10))} title="Zoom In"><ZoomIn className="w-3.5 h-3.5" /></TB>

      <div className="hidden md:flex items-center gap-1 w-28 px-2">
        <Slider
          value={[zoom]}
          min={10}
          max={500}
          step={1}
          onValueChange={v => onZoom(v[0])}
          className="w-full"
        />
      </div>

      <TB onClick={() => onZoom('fit')} title="Fit Page"><Maximize className="w-3.5 h-3.5" /></TB>
      <TB onClick={() => onZoom('width')} title="Fit Width"><Scan className="w-3.5 h-3.5" /></TB>
      <TB onClick={() => onZoom('actual')} title="Actual Size (100%)"><Shrink className="w-3.5 h-3.5" /></TB>

      <Sep />

      {/* Preview */}
      <TB onClick={onPreview} title="Preview">
        <Eye className="w-3.5 h-3.5" />
      </TB>

      {hasUnsavedChanges && (
        <span className="hidden md:inline text-[10px] text-amber-600 font-medium whitespace-nowrap">
          Unsaved
        </span>
      )}

      {/* Save */}
      <button
        onClick={onSave}
        disabled={saveStatus === 'saving'}
        className={cn(
          'flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-semibold transition-all shrink-0',
          saveStatus === 'saved'
            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
            : 'bg-primary text-primary-foreground hover:bg-primary/90',
          saveStatus === 'saving' && 'opacity-60 cursor-not-allowed',
        )}
      >
        {saveStatus === 'saving' && <Loader2      className="w-3 h-3 animate-spin" />}
        {saveStatus === 'saved'  && <CheckCircle2 className="w-3 h-3" />}
        {saveStatus === 'idle'   && <Save         className="w-3 h-3" />}
        <span className="hidden sm:inline">
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save'}
        </span>
      </button>
    </div>
  );
};
